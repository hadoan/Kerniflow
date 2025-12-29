import type { OutboxPort } from "@kerniflow/kernel";

export class FakeOutbox implements OutboxPort {
  events: any[] = [];
  async enqueue(event: any): Promise<void> {
    this.events.push(event);
  }
}
