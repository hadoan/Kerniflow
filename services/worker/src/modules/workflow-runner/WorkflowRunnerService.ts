import { Injectable, OnModuleInit } from '@nestjs/common';
import { OutboxRepository } from '@kerniflow/data';
import { EVENT_NAMES } from '@kerniflow/contracts';

@Injectable()
export class WorkflowRunnerService implements OnModuleInit {
  private intervalId: NodeJS.Timeout;

  constructor(private readonly outboxRepo: OutboxRepository) {}

  onModuleInit() {
    this.startPolling();
  }

  private startPolling() {
    this.intervalId = setInterval(async () => {
      // Poll for expense.created and invoice.issued
      const events = await this.outboxRepo.fetchPending(10);
      for (const event of events) {
        if (event.eventType === EVENT_NAMES.EXPENSE_CREATED) {
          console.log('Saga: Handling expense created, updating workflow instance');
          // Placeholder: update WorkflowInstance
        } else if (event.eventType === EVENT_NAMES.INVOICE_ISSUED) {
          console.log('Saga: Handling invoice issued, emitting follow-up command');
          // Placeholder: log command
        }
      }
    }, 10000); // 10 seconds
  }

  onModuleDestroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }
}