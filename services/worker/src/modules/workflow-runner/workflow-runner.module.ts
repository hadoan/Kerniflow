import { Module } from "@nestjs/common";
import { WorkflowRunnerService } from "./workflow-runner.service";

@Module({
  providers: [WorkflowRunnerService],
})
export class WorkflowRunnerModule {}
