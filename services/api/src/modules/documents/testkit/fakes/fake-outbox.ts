import type { OutboxPort } from "../../application/ports/outbox.port";

export class FakeOutboxPort implements OutboxPort {
  events: Array<{ eventType: string; payload: any; tenantId: string; correlationId?: string }> = [];

  async enqueue(event: {
    eventType: string;
    payload: any;
    tenantId: string;
    correlationId?: string | undefined;
  }): Promise<void> {
    this.events.push(event);
  }
}
