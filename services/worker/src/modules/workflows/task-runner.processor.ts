import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { Worker, type Job } from "bullmq";
import { WORKFLOW_TASK_QUEUE, type WorkflowEventInput } from "@corely/contracts";
import {
  PrismaService,
  WorkflowEventRepository,
  WorkflowInstanceRepository,
  WorkflowTaskRepository,
} from "@corely/data";
import type { TransactionContext } from "@corely/kernel";
import { WorkflowQueues } from "./workflow-queues";
import { WorkflowMetricsService } from "./workflow-metrics.service";
import { TaskHandlerRegistry } from "./handlers/task-handler.registry";
import type { WorkflowTaskPayload } from "./handlers/task-handler.interface";
import type { WorkflowPorts } from "./ports/workflow-ports";
import { SystemClock } from "./ports/system-clock";
import { SystemHttpAdapter } from "./ports/system-http.adapter";
import { ConsoleEmailAdapter } from "./ports/console-email.adapter";
import { NoopLlmAdapter } from "./ports/noop-llm.adapter";

interface TaskRunnerJobPayload {
  tenantId: string;
  taskId: string;
  instanceId: string;
}

@Injectable()
export class WorkflowTaskRunnerProcessor implements OnModuleInit, OnModuleDestroy {
  private worker: Worker | undefined;
  private readonly logger = new Logger(WorkflowTaskRunnerProcessor.name);
  private readonly workerId = `workflow-worker-${process.pid}`;
  private readonly ports: WorkflowPorts = {
    clock: new SystemClock(),
    http: new SystemHttpAdapter(),
    email: new ConsoleEmailAdapter(),
    llm: new NoopLlmAdapter(),
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly tasks: WorkflowTaskRepository,
    private readonly instances: WorkflowInstanceRepository,
    private readonly events: WorkflowEventRepository,
    private readonly queues: WorkflowQueues,
    private readonly metrics: WorkflowMetricsService,
    private readonly registry: TaskHandlerRegistry
  ) {}

  onModuleInit() {
    this.worker = new Worker(
      WORKFLOW_TASK_QUEUE,
      async (job) => this.process(job as Job<TaskRunnerJobPayload>),
      {
        connection: this.queues.connection,
        concurrency: 10,
      }
    );
  }

  async onModuleDestroy() {
    if (this.worker) {
      await this.worker.close();
    }
  }

  private async process(job: Job<TaskRunnerJobPayload>) {
    const startedAt = Date.now();
    this.metrics.recordQueueLatency({
      queue: WORKFLOW_TASK_QUEUE,
      jobId: job.id,
      latencyMs: startedAt - job.timestamp,
    });

    const { tenantId, taskId } = job.data;
    const now = new Date();

    const task = await this.tasks.claimTask(tenantId, taskId, this.workerId, now);
    if (!task) {
      return;
    }

    await this.events.append({
      tenantId,
      instanceId: task.instanceId,
      type: "TASK_STARTED",
      payload: JSON.stringify({ taskId: task.id, workerId: this.workerId }),
    });

    const handler = this.registry.getHandler(task.type);
    if (!handler) {
      await this.tasks.markFailed(
        tenantId,
        task.id,
        JSON.stringify({ message: "No handler registered" }),
        "FAILED"
      );
      throw new Error(`No handler for task type ${task.type}`);
    }

    let parsedInput: Record<string, unknown> = {};
    if (task.input) {
      try {
        parsedInput = JSON.parse(task.input) as Record<string, unknown>;
      } catch {
        parsedInput = {};
      }
    }

    const payload: WorkflowTaskPayload = {
      id: task.id,
      tenantId,
      instanceId: task.instanceId,
      type: task.type,
      input: parsedInput,
    };

    try {
      const result = await handler.execute(payload, this.ports);
      if (result.status === "FAILED") {
        await this.handleFailure(task, tenantId, result.error ?? { message: "Failed" });
        throw new Error(`Task ${task.id} failed`);
      }

      const completionEvent = this.extractCompletionEvent(task.input);
      const emittedEvent = result.emittedEvent;
      const followupEvents: WorkflowEventInput[] = [
        { type: completionEvent, payload: { taskId: task.id } },
      ];

      if (emittedEvent) {
        followupEvents.push({ type: emittedEvent, payload: { taskId: task.id } });
      }

      await this.prisma.$transaction(async (tx) => {
        await this.tasks.markSucceeded(
          tenantId,
          task.id,
          JSON.stringify({
            ...(result.output ?? {}),
            suggestedEvent: result.suggestedEvent ?? null,
          }),
          tx as TransactionContext
        );

        await this.events.append(
          {
            tenantId,
            instanceId: task.instanceId,
            type: "TASK_COMPLETED",
            payload: JSON.stringify({ taskId: task.id, output: result.output ?? {} }),
          },
          tx as TransactionContext
        );
      });

      this.metrics.recordTaskResult({
        tenantId,
        taskId: task.id,
        type: task.type,
        status: "SUCCEEDED",
      });

      await this.queues.orchestratorQueue.add(
        `orchestrate:${task.instanceId}`,
        {
          tenantId,
          instanceId: task.instanceId,
          events: followupEvents,
        },
        {
          jobId: `${task.instanceId}:${Date.now()}`,
          attempts: 5,
          backoff: { type: "exponential", delay: 2000 },
        }
      );
    } catch (error) {
      await this.handleFailure(task, tenantId, {
        message: error instanceof Error ? error.message : "Task failed",
      });
      throw error;
    }
  }

  private async handleFailure(
    task: { id: string; instanceId: string; attempts: number; maxAttempts: number; type: string },
    tenantId: string,
    error: Record<string, unknown>
  ) {
    const willRetry = task.attempts < task.maxAttempts;
    const status = willRetry ? "PENDING" : "FAILED";

    await this.prisma.$transaction(async (tx) => {
      await this.tasks.markFailed(
        tenantId,
        task.id,
        JSON.stringify(error),
        status,
        tx as TransactionContext
      );

      await this.events.append(
        {
          tenantId,
          instanceId: task.instanceId,
          type: "TASK_FAILED",
          payload: JSON.stringify({ taskId: task.id, error, willRetry }),
        },
        tx as TransactionContext
      );

      if (!willRetry) {
        await this.instances.updateStatus(
          tenantId,
          task.instanceId,
          "FAILED",
          tx as TransactionContext
        );
      }
    });

    this.metrics.recordTaskResult({
      tenantId,
      taskId: task.id,
      type: task.type,
      status: "FAILED",
    });

    if (!willRetry) {
      await this.queues.orchestratorQueue.add(
        `orchestrate:${task.instanceId}`,
        {
          tenantId,
          instanceId: task.instanceId,
          events: [{ type: "TASK_FAILED", payload: { taskId: task.id, error } }],
        },
        {
          jobId: `${task.instanceId}:${Date.now()}`,
          attempts: 3,
          backoff: { type: "exponential", delay: 2000 },
        }
      );
    }
  }

  private extractCompletionEvent(input: string | null): string {
    if (!input) {
      return "TASK_COMPLETED";
    }

    try {
      const parsed = JSON.parse(input) as { completionEvent?: string };
      return parsed.completionEvent ?? "TASK_COMPLETED";
    } catch {
      return "TASK_COMPLETED";
    }
  }
}
