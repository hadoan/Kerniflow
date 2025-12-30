import type { SyncPosSaleOutput } from "@corely/contracts";

export const POS_SALE_IDEMPOTENCY_PORT = "pos/pos-sale-idempotency";

export interface PosSaleIdempotencyPort {
  /**
   * Get cached sync result by idempotency key
   */
  get(workspaceId: string, idempotencyKey: string): Promise<SyncPosSaleOutput | null>;

  /**
   * Store sync result with idempotency key
   */
  store(
    workspaceId: string,
    idempotencyKey: string,
    posSaleId: string,
    result: SyncPosSaleOutput
  ): Promise<void>;
}
