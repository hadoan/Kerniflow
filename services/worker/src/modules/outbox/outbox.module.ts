import { Module } from "@nestjs/common";
import { OutboxPollerService } from "./OutboxPollerService";
import { OutboxRepository } from "@kerniflow/data";

@Module({
  providers: [
    OutboxPollerService,
    {
      provide: OutboxRepository,
      useValue: new OutboxRepository(), // Explicit instance to avoid DI token resolution issues
    },
  ],
})
export class OutboxModule {}
