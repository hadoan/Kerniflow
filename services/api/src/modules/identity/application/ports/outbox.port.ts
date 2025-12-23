/**
 * Outbox Port (Interface)
 * Abstracts event publishing via Outbox pattern
 */
export interface IOutboxPort {
  /**
   * Enqueue an event for publishing
   */
  enqueue(data: { tenantId: string; eventType: string; payloadJson: string }): Promise<void>;
}

export const OUTBOX_PORT_TOKEN = Symbol("OUTBOX_PORT");
