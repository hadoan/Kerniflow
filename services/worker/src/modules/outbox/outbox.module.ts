import { Module } from '@nestjs/common';
import { OutboxPollerService } from './OutboxPollerService';
import { OutboxRepository } from '@kerniflow/data';

@Module({
  providers: [OutboxPollerService, OutboxRepository],
})
export class OutboxModule {}