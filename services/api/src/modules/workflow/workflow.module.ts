import { Module } from "@nestjs/common";
import { EnvService } from "@corely/config";
import {
  WORKFLOW_ORCHESTRATOR_QUEUE,
  WORKFLOW_ORCHESTRATOR_QUEUE_PORT,
  WORKFLOW_ORCHESTRATOR_QUEUE_ROUTE,
  type WorkflowOrchestratorQueuePayload,
} from "@corely/contracts";
import { WorkflowDefinitionsController } from "./adapters/http/workflow-definitions.controller";
import { WorkflowInstancesController } from "./adapters/http/workflow-instances.controller";
import { WorkflowTasksController } from "./adapters/http/workflow-tasks.controller";
import { WorkflowService } from "./application/workflow.service";
import { WorkflowQueueClient } from "./infrastructure/workflow-queue.client";
import { createWorkflowQueueAdapter } from "./infrastructure/workflow-queue.provider";

@Module({
  controllers: [
    WorkflowDefinitionsController,
    WorkflowInstancesController,
    WorkflowTasksController,
  ],
  providers: [
    WorkflowService,
    WorkflowQueueClient,
    {
      provide: WORKFLOW_ORCHESTRATOR_QUEUE_PORT,
      useFactory: (env: EnvService) =>
        createWorkflowQueueAdapter<WorkflowOrchestratorQueuePayload>(
          WORKFLOW_ORCHESTRATOR_QUEUE,
          env,
          WORKFLOW_ORCHESTRATOR_QUEUE_ROUTE
        ),
      inject: [EnvService],
    },
  ],
  exports: [WorkflowService],
})
export class WorkflowModule {}
