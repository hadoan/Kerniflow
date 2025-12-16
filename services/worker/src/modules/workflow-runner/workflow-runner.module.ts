import { Module } from '@nestjs/common';
import { WorkflowRunnerService } from './WorkflowRunnerService';
import { OutboxRepository } from '@kerniflow/data';

@Module({
  providers: [WorkflowRunnerService, OutboxRepository],
})
export class WorkflowRunnerModule {}