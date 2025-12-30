import type { OutboxPort } from "@corely/kernel";

export class FakeOutbox implements OutboxPort {
  events: any[] = [];
  async enqueue(event: any): Promise<void> {
    this.events.push(event);
  }
}
