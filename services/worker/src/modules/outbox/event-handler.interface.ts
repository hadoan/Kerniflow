export interface OutboxEvent {
  id: string;
  tenantId: string;
  eventType: string;
  payloadJson: string;
  correlationId?: string | null;
}

export interface EventHandler {
  readonly eventType: string;
  handle(event: OutboxEvent): Promise<void>;
}
