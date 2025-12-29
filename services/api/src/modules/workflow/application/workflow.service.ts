import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import {
  WORKFLOW_START_EVENT,
  type CompleteWorkflowTaskInput,
  type CreateWorkflowDefinitionInput,
  type ListWorkflowDefinitionsQuery,
  type ListWorkflowInstancesQuery,
  type SendWorkflowEventInput,
  type StartWorkflowInstanceInput,
} from "@kerniflow/contracts";
import { getInitialSnapshot, serializeSnapshot } from "@kerniflow/core";
import {
  PrismaService,
  WorkflowDefinitionRepository,
  WorkflowEventRepository,
  WorkflowInstanceRepository,
  WorkflowTaskRepository,
} from "@kerniflow/data";
import type { TransactionContext } from "@kerniflow/kernel";
import { WorkflowQueueClient } from "../infrastructure/workflow-queue.client";

@Injectable()
export class WorkflowService {
  private readonly logger = new Logger(WorkflowService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly definitions: WorkflowDefinitionRepository,
    private readonly instances: WorkflowInstanceRepository,
    private readonly tasks: WorkflowTaskRepository,
    private readonly events: WorkflowEventRepository,
    private readonly queue: WorkflowQueueClient
  ) {}

  async createDefinition(tenantId: string, input: CreateWorkflowDefinitionInput) {
    const specJson = JSON.stringify(input.spec);

    const definition = await this.definitions.create({
      tenantId,
      key: input.key,
      version: input.version ?? 1,
      name: input.name,
      description: input.description ?? null,
      status: input.status ?? "ACTIVE",
      spec: specJson,
      createdBy: input.createdBy ?? null,
    });

    this.logger.log(
      JSON.stringify({
        message: "workflow.definition.created",
        tenantId,
        definitionId: definition.id,
        key: definition.key,
        version: definition.version,
      })
    );

    return definition;
  }

  async listDefinitions(tenantId: string, query: ListWorkflowDefinitionsQuery) {
    return this.definitions.list(tenantId, query);
  }

  async getDefinition(tenantId: string, id: string) {
    const definition = await this.definitions.findById(tenantId, id);
    if (!definition) {
      throw new NotFoundException("Workflow definition not found");
    }
    return definition;
  }

  async setDefinitionStatus(
    tenantId: string,
    id: string,
    status: "ACTIVE" | "INACTIVE" | "ARCHIVED"
  ) {
    const result = await this.definitions.updateStatus(tenantId, id, status);
    if (result.count === 0) {
      throw new NotFoundException("Workflow definition not found");
    }
    return result;
  }

  async startInstance(tenantId: string, input: StartWorkflowInstanceInput) {
    const definition = input.definitionId
      ? await this.definitions.findById(tenantId, input.definitionId)
      : await this.definitions.findActiveByKey(
          tenantId,
          input.definitionKey as string,
          input.definitionVersion
        );

    if (!definition) {
      throw new NotFoundException("Workflow definition not found");
    }

    const existing = input.businessKey
      ? await this.instances.findByBusinessKey(tenantId, definition.id, input.businessKey)
      : null;

    if (existing) {
      return existing;
    }

    const spec = JSON.parse(definition.spec) as any;
    const snapshot = getInitialSnapshot(spec, input.context ?? {});
    const serialized = serializeSnapshot(snapshot);
    const now = new Date();

    const instance = await this.prisma.$transaction(async (tx) => {
      const created = await this.instances.create(
        {
          tenantId,
          definitionId: definition.id,
          businessKey: input.businessKey ?? null,
          status: "PENDING",
          currentState: serialized.currentState,
          context: serialized.context,
          startedAt: now,
        },
        tx as TransactionContext
      );

      await this.events.append(
        {
          tenantId,
          instanceId: created.id,
          type: "INSTANCE_STARTED",
          payload: JSON.stringify({
            definitionId: definition.id,
            businessKey: input.businessKey ?? null,
          }),
        },
        tx as TransactionContext
      );

      return created;
    });

    await this.queue.enqueueOrchestrator({
      tenantId,
      instanceId: instance.id,
      events: [
        input.startEvent ?? {
          type: WORKFLOW_START_EVENT,
          payload: { definitionId: definition.id },
        },
      ],
    });

    return instance;
  }

  async listInstances(tenantId: string, query: ListWorkflowInstancesQuery) {
    return this.instances.list(tenantId, query);
  }

  async getInstance(tenantId: string, id: string) {
    const instance = await this.instances.getWithDetails(tenantId, id);
    if (!instance) {
      throw new NotFoundException("Workflow instance not found");
    }
    return instance;
  }

  async cancelInstance(tenantId: string, id: string) {
    const result = await this.prisma.$transaction(async (tx) => {
      const updated = await this.instances.updateStatus(
        tenantId,
        id,
        "CANCELLED",
        tx as TransactionContext
      );

      if (updated.count === 0) {
        throw new NotFoundException("Workflow instance not found");
      }

      await this.events.append(
        {
          tenantId,
          instanceId: id,
          type: "INSTANCE_CANCELLED",
          payload: JSON.stringify({ reason: "manual" }),
        },
        tx as TransactionContext
      );

      return updated;
    });

    return result;
  }

  async sendEvent(tenantId: string, instanceId: string, input: SendWorkflowEventInput) {
    const instance = await this.instances.findById(tenantId, instanceId);
    if (!instance) {
      throw new NotFoundException("Workflow instance not found");
    }

    await this.events.append({
      tenantId,
      instanceId,
      type: "EVENT_RECEIVED",
      payload: JSON.stringify(input.event),
    });

    await this.queue.enqueueOrchestrator({
      tenantId,
      instanceId,
      events: [input.event],
    });

    return { accepted: true };
  }

  async listTasks(tenantId: string, instanceId: string) {
    return this.tasks.listByInstance(tenantId, instanceId);
  }

  async completeTask(tenantId: string, taskId: string, input: CompleteWorkflowTaskInput) {
    const task = await this.tasks.findById(tenantId, taskId);
    if (!task) {
      throw new NotFoundException("Workflow task not found");
    }

    if (task.type !== "HUMAN") {
      throw new BadRequestException("Only HUMAN tasks can be completed via API");
    }

    const completionEvent = this.extractCompletionEvent(task.input);

    await this.prisma.$transaction(async (tx) => {
      await this.tasks.markSucceeded(
        tenantId,
        taskId,
        JSON.stringify(input.output ?? {}),
        tx as TransactionContext
      );

      await this.events.append(
        {
          tenantId,
          instanceId: task.instanceId,
          type: "TASK_COMPLETED",
          payload: JSON.stringify({ taskId, output: input.output ?? {} }),
        },
        tx as TransactionContext
      );
    });

    await this.queue.enqueueOrchestrator({
      tenantId,
      instanceId: task.instanceId,
      events: [input.event ?? { type: completionEvent, payload: { taskId } }],
    });

    return { ok: true };
  }

  async failTask(tenantId: string, taskId: string, error: Record<string, unknown> = {}) {
    const task = await this.tasks.findById(tenantId, taskId);
    if (!task) {
      throw new NotFoundException("Workflow task not found");
    }

    await this.prisma.$transaction(async (tx) => {
      await this.tasks.markFailed(
        tenantId,
        taskId,
        JSON.stringify(error),
        "FAILED",
        tx as TransactionContext
      );

      await this.events.append(
        {
          tenantId,
          instanceId: task.instanceId,
          type: "TASK_FAILED",
          payload: JSON.stringify({ taskId, error }),
        },
        tx as TransactionContext
      );
    });

    await this.queue.enqueueOrchestrator({
      tenantId,
      instanceId: task.instanceId,
      events: [{ type: "TASK_FAILED", payload: { taskId } }],
    });

    return { ok: true };
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
