export interface OutboxPort {
  enqueue(event: {
    tenantId: string;
    eventType: string;
    payloadJson: string;
    correlationId?: string;
  }): Promise<void>;
}
