import { Inject, Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import type { QueuePort } from "@corely/kernel";
import {
  WORKFLOW_ORCHESTRATOR_QUEUE_PORT,
  type WorkflowOrchestratorQueuePayload,
} from "@corely/contracts";

@Injectable()
export class WorkflowQueueClient implements OnModuleDestroy {
  private readonly logger = new Logger(WorkflowQueueClient.name);

  constructor(
    @Inject(WORKFLOW_ORCHESTRATOR_QUEUE_PORT)
    private readonly queue: QueuePort<WorkflowOrchestratorQueuePayload>
  ) {}

  async enqueueOrchestrator(payload: WorkflowOrchestratorQueuePayload) {
    await this.queue.enqueue(payload, {
      jobName: `orchestrate:${payload.instanceId}`,
      jobId: `${payload.instanceId}:${Date.now()}`,
      attempts: 5,
      backoff: { type: "exponential", delayMs: 2000 },
    });

    this.logger.debug(
      JSON.stringify({
        message: "workflow.orchestrator.enqueued",
        tenantId: payload.tenantId,
        instanceId: payload.instanceId,
        eventCount: payload.events.length,
      })
    );
  }

  async onModuleDestroy() {
    await this.queue.close();
  }
}
