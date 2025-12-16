import { Module } from "@nestjs/common";
import { OutboxModule } from "./modules/outbox/outbox.module";
import { WorkflowRunnerModule } from "./modules/workflow-runner/workflow-runner.module";

@Module({
  imports: [OutboxModule, WorkflowRunnerModule],
})
export class WorkerModule {}
