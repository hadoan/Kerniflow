import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { Worker, type Job } from "bullmq";
import {
  WORKFLOW_ORCHESTRATOR_QUEUE,
  type WorkflowEventInput,
  type WorkflowTaskCreateSpec,
} from "@corely/contracts";
import { applyWorkflowEvents, restoreSnapshot, serializeSnapshot } from "@corely/core";
import {
  PrismaService,
  WorkflowDefinitionRepository,
  WorkflowEventRepository,
  WorkflowInstanceRepository,
  WorkflowTaskRepository,
} from "@corely/data";
import type { TransactionContext } from "@corely/kernel";
import { WorkflowQueues } from "./workflow-queues";
import { WorkflowMetricsService } from "./workflow-metrics.service";

interface OrchestratorJobPayload {
  tenantId: string;
  instanceId: string;
  events: WorkflowEventInput[];
}

@Injectable()
export class WorkflowOrchestratorProcessor implements OnModuleInit, OnModuleDestroy {
  private worker: Worker | undefined;
  private readonly logger = new Logger(WorkflowOrchestratorProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly definitions: WorkflowDefinitionRepository,
    private readonly instances: WorkflowInstanceRepository,
    private readonly tasks: WorkflowTaskRepository,
    private readonly events: WorkflowEventRepository,
    private readonly queues: WorkflowQueues,
    private readonly metrics: WorkflowMetricsService
  ) {}

  onModuleInit() {
    this.worker = new Worker(
      WORKFLOW_ORCHESTRATOR_QUEUE,
      async (job) => this.process(job as Job<OrchestratorJobPayload>),
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

  private async process(job: Job<OrchestratorJobPayload>) {
    const startedAt = Date.now();
    this.metrics.recordQueueLatency({
      queue: WORKFLOW_ORCHESTRATOR_QUEUE,
      jobId: job.id,
      latencyMs: startedAt - job.timestamp,
    });

    const { tenantId, instanceId, events } = job.data;
    if (!events?.length) {
      return;
    }

    const instance = await this.instances.findById(tenantId, instanceId);
    if (!instance) {
      this.logger.warn(
        JSON.stringify({
          message: "workflow.instance.missing",
          tenantId,
          instanceId,
        })
      );
      return;
    }

    const definition = await this.definitions.findById(tenantId, instance.definitionId);
    if (!definition) {
      throw new Error(`Workflow definition missing for instance ${instanceId}`);
    }

    const spec = JSON.parse(definition.spec) as any;
    const currentSnapshot = restoreSnapshot({
      currentState: instance.currentState,
      context: instance.context,
    });
    const result = applyWorkflowEvents(spec, currentSnapshot, events);

    const serialized = serializeSnapshot(result.snapshot);
    const hasFinal = this.isFinalState(spec, result.snapshot.value);
    const nextStatus = this.deriveStatus(events, result.tasks, hasFinal);
    const now = new Date();

    const historyEvents = [
      ...events.map((event) => ({
        tenantId,
        instanceId,
        type: "EVENT_APPLIED",
        payload: JSON.stringify(event),
      })),
      ...result.transitions.map((transition) => ({
        tenantId,
        instanceId,
        type: "STATE_TRANSITION",
        payload: JSON.stringify({
          event: transition.event,
          from: transition.from,
          to: transition.to,
        }),
      })),
      ...(hasFinal
        ? [
            {
              tenantId,
              instanceId,
              type: "INSTANCE_COMPLETED",
              payload: JSON.stringify({ completedAt: now.toISOString() }),
            },
          ]
        : []),
      ...(nextStatus === "FAILED"
        ? [
            {
              tenantId,
              instanceId,
              type: "INSTANCE_FAILED",
              payload: JSON.stringify({ failedAt: now.toISOString() }),
            },
          ]
        : []),
    ];

    const taskInputs = result.tasks.map((task) =>
      this.toTaskCreateInput(tenantId, instanceId, task, job.id)
    );

    const updateResult = await this.prisma.$transaction(async (tx) => {
      const updated = await this.instances.updateSnapshotIfCurrent(
        tenantId,
        instanceId,
        instance.updatedAt,
        {
          status: nextStatus,
          currentState: serialized.currentState,
          context: serialized.context,
          startedAt: instance.startedAt ?? now,
          completedAt: hasFinal ? now : null,
          lastError: nextStatus === "FAILED" ? JSON.stringify({ reason: "Task failed" }) : null,
        },
        tx as TransactionContext
      );

      if (updated.count === 0) {
        throw new Error("Workflow instance updated concurrently");
      }

      const createdTasks = await this.tasks.createTasks(taskInputs, tx as TransactionContext);

      await this.events.appendMany(
        [
          ...historyEvents,
          ...createdTasks.map((task) => ({
            tenantId,
            instanceId,
            type: "TASK_CREATED",
            payload: JSON.stringify({ taskId: task.id }),
          })),
        ],
        tx as TransactionContext
      );

      return createdTasks;
    });

    if (job.id) {
      const queuedTasks = await this.tasks.listByTraceId(tenantId, String(job.id));
      await this.enqueueTasks(tenantId, instanceId, queuedTasks);
    }

    this.logger.log(
      JSON.stringify({
        message: "workflow.instance.advanced",
        tenantId,
        instanceId,
        status: nextStatus,
        taskCount: updateResult.length,
      })
    );
  }

  private deriveStatus(
    events: WorkflowEventInput[],
    tasks: WorkflowTaskCreateSpec[],
    isFinal: boolean
  ) {
    if (events.some((event) => event.type === "TASK_FAILED")) {
      return "FAILED";
    }

    if (isFinal) {
      return "COMPLETED";
    }

    if (!tasks.length) {
      return "RUNNING";
    }

    const hasHuman = tasks.some((task) => task.type === "HUMAN");
    const hasTimers = tasks.some((task) => task.type === "TIMER" && task.runAt);

    if (hasHuman || hasTimers) {
      return "WAITING";
    }

    return "RUNNING";
  }

  private isFinalState(spec: any, value: unknown): boolean {
    if (typeof value === "string") {
      return spec.states?.[value]?.type === "final";
    }

    return false;
  }

  private toTaskCreateInput(
    tenantId: string,
    instanceId: string,
    task: WorkflowTaskCreateSpec,
    jobId: string | number | undefined
  ) {
    const input = {
      ...(task.input ?? {}),
      completionEvent: task.completionEvent,
    } as Record<string, unknown>;

    return {
      tenantId,
      instanceId,
      name: task.name ?? task.type,
      type: task.type,
      status: "PENDING" as const,
      runAt: task.runAt ? new Date(task.runAt) : null,
      dueAt: task.dueAt ? new Date(task.dueAt) : null,
      maxAttempts: task.maxAttempts,
      assigneeUserId: task.assigneeUserId ?? null,
      assigneeRoleId: task.assigneeRoleId ?? null,
      assigneePermissionKey: task.assigneePermissionKey ?? null,
      idempotencyKey: task.idempotencyKey ?? null,
      input: JSON.stringify(input),
      traceId: jobId ? String(jobId) : null,
    };
  }

  private async enqueueTasks(
    tenantId: string,
    instanceId: string,
    createdTasks: Array<{
      id: string;
      type: string;
      runAt: Date | null;
      maxAttempts: number;
    }>
  ) {
    if (!createdTasks.length) {
      return;
    }

    const queue = this.queues.taskQueue;

    for (const task of createdTasks) {
      if (task.type === "HUMAN") {
        continue;
      }

      const delayMs = task.runAt ? Math.max(task.runAt.getTime() - Date.now(), 0) : 0;
      await queue.add(
        `task:${task.id}`,
        { tenantId, taskId: task.id, instanceId },
        {
          jobId: task.id,
          delay: delayMs,
          attempts: task.maxAttempts ?? 3,
          backoff: { type: "exponential", delay: 5000 },
        }
      );
    }
  }
}
