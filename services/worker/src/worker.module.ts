import { Module } from "@nestjs/common";
import { EnvModule } from "@kerniflow/config";
import { DataModule } from "@kerniflow/data";
import { OutboxModule } from "./modules/outbox/outbox.module";
import { WorkflowRunnerModule } from "./modules/workflow-runner/workflow-runner.module";

@Module({
  imports: [
    // Config must be first to validate env before other modules use it
    EnvModule.forRoot(),
    DataModule,
    OutboxModule,
    WorkflowRunnerModule,
  ],
})
export class WorkerModule {}
