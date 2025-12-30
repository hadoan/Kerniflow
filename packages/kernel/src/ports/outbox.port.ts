import { type TransactionContext } from "./unit-of-work.port";

export type OutboxEventEnvelope = {
  eventType: string;
  payload: unknown;
  tenantId: string;
  correlationId?: string;
  availableAt?: Date;
};

export interface OutboxPort {
  enqueue(event: OutboxEventEnvelope, tx?: TransactionContext): Promise<void>;
}

export const OUTBOX_PORT = "kernel/outbox-port";
