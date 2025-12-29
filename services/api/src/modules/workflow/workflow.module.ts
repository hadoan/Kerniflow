import { Module } from "@nestjs/common";
import { WorkflowDefinitionsController } from "./adapters/http/workflow-definitions.controller";
import { WorkflowInstancesController } from "./adapters/http/workflow-instances.controller";
import { WorkflowTasksController } from "./adapters/http/workflow-tasks.controller";
import { WorkflowService } from "./application/workflow.service";
import { WorkflowQueueClient } from "./infrastructure/workflow-queue.client";

@Module({
  controllers: [
    WorkflowDefinitionsController,
    WorkflowInstancesController,
    WorkflowTasksController,
  ],
  providers: [WorkflowService, WorkflowQueueClient],
})
export class WorkflowModule {}
