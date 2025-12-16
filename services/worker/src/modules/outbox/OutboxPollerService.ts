import { Injectable, OnModuleInit } from '@nestjs/common';
import { OutboxRepository } from '@kerniflow/data';

@Injectable()
export class OutboxPollerService implements OnModuleInit {
  private intervalId: NodeJS.Timeout;

  constructor(private readonly outboxRepo: OutboxRepository) {}

  onModuleInit() {
    this.startPolling();
  }

  private startPolling() {
    this.intervalId = setInterval(async () => {
      const events = await this.outboxRepo.fetchPending(10);
      for (const event of events) {
        try {
          // Placeholder: publish by logging
          console.log('Publishing outbox event:', event.eventType, event.payloadJson);
          await this.outboxRepo.markSent(event.id);
        } catch (error) {
          console.error('Failed to publish event:', event.id, error);
          await this.outboxRepo.markFailed(event.id, error.message);
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