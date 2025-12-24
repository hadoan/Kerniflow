export type IdempotencyDecision =
  | { mode: "STARTED" }
  | { mode: "REPLAY"; responseStatus: number; responseBody: unknown }
  | { mode: "IN_PROGRESS"; retryAfterMs?: number }
  | { mode: "MISMATCH" }
  | { mode: "FAILED"; responseStatus: number; responseBody: unknown };

export interface CopilotIdempotencyPort {
  startOrReplay(params: {
    actionKey: string;
    tenantId: string;
    userId: string;
    idempotencyKey: string;
    requestHash?: string;
  }): Promise<IdempotencyDecision>;
  markCompleted(params: {
    actionKey: string;
    tenantId: string;
    idempotencyKey: string;
    responseStatus: number;
    responseBody: unknown;
  }): Promise<void>;
  markFailed(params: {
    actionKey: string;
    tenantId: string;
    idempotencyKey: string;
    responseStatus?: number;
    responseBody?: unknown;
  }): Promise<void>;
}
