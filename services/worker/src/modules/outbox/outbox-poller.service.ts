import { Injectable, OnModuleInit } from "@nestjs/common";
import { OutboxRepository } from "@corely/data";
import { EventHandler } from "./event-handler.interface";

@Injectable()
export class OutboxPollerService implements OnModuleInit {
  private intervalId: NodeJS.Timeout | undefined;
  private handlers = new Map<string, EventHandler>();

  constructor(
    private readonly outboxRepo: OutboxRepository,
    handlers: EventHandler[]
  ) {
    for (const handler of handlers) {
      this.handlers.set(handler.eventType, handler);
    }
  }

  onModuleInit() {
    this.startPolling();
  }

  private startPolling() {
    this.intervalId = setInterval(async () => {
      const events = await this.outboxRepo.fetchPending(10);
      for (const event of events) {
        try {
          const handler = this.handlers.get(event.eventType);
          if (handler) {
            await handler.handle(event);
          } else {
            console.warn(`No handler found for event type: ${event.eventType}`);
          }
          await this.outboxRepo.markSent(event.id);
        } catch (error) {
          console.error("Failed to publish event:", event.id, error);
          const errorMessage = error instanceof Error ? error.message : String(error);
          await this.outboxRepo.markFailed(event.id, errorMessage);
        }
      }
    }, 5000); // 5 seconds
  }

  onModuleDestroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }
}
