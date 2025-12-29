import type { OutboxPort } from "../../application/ports/outbox.port";

export class MockOutbox implements OutboxPort {
  events: Array<{ tenantId: string; eventType: string; payload: unknown }> = [];

  async enqueue(data: { tenantId: string; eventType: string; payload: unknown }): Promise<void> {
    this.events.push(data);
  }
}
