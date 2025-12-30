import type { OutboxPort } from "@corely/kernel";

export class MockOutboxPort implements OutboxPort {
  public events: Array<{
    eventType: string;
    payload: any;
    tenantId: string;
    correlationId?: string;
  }> = [];

  async enqueue(event: {
    eventType: string;
    payload: any;
    tenantId: string;
    correlationId?: string;
  }): Promise<void> {
    this.events.push(event);
  }
}
