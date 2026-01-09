import { Inject, Injectable, OnModuleDestroy } from "@nestjs/common";
import {
  WORKFLOW_ORCHESTRATOR_QUEUE_PORT,
  WORKFLOW_TASK_QUEUE_PORT,
  type WorkflowOrchestratorQueuePayload,
  type WorkflowTaskQueuePayload,
} from "@corely/contracts";
import type { QueuePort } from "@corely/kernel";

@Injectable()
export class WorkflowQueueLifecycle implements OnModuleDestroy {
  constructor(
    @Inject(WORKFLOW_ORCHESTRATOR_QUEUE_PORT)
    private readonly orchestratorQueue: QueuePort<WorkflowOrchestratorQueuePayload>,
    @Inject(WORKFLOW_TASK_QUEUE_PORT)
    private readonly taskQueue: QueuePort<WorkflowTaskQueuePayload>
  ) {}

  async onModuleDestroy() {
    await this.orchestratorQueue.close();
    await this.taskQueue.close();
  }
}
