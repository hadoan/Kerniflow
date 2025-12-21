import { OutboxPort } from "../../application/ports/outbox.port";

export type OutboxEvent = {
  tenantId: string;
  eventType: string;
  payloadJson: string;
  correlationId?: string;
};

export class FakeOutbox implements OutboxPort {
  events: OutboxEvent[] = [];

  async enqueue(event: {
    tenantId: string;
    eventType: string;
    payloadJson: string;
    correlationId?: string;
  }): Promise<void> {
    this.events.push({ ...event });
  }

  // Test helper
  getEvents(): OutboxEvent[] {
    return this.events;
  }

  // Test helper
  getEventsByType(eventType: string): OutboxEvent[] {
    return this.events.filter((e) => e.eventType === eventType);
  }

  // Test helper
  clear(): void {
    this.events = [];
  }
}
