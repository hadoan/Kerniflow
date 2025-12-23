import { Module } from "@nestjs/common";
import { WorkflowRunnerService } from "./WorkflowRunnerService";

@Module({
  providers: [WorkflowRunnerService],
})
export class WorkflowRunnerModule {}
