import type { TaxSnapshotEntity } from "../entities";
import type { TaxSourceType } from "@corely/contracts";

export abstract class TaxSnapshotRepoPort {
  /**
   * Create immutable snapshot (idempotent by sourceType + sourceId)
   */
  abstract lockSnapshot(
    snapshot: Omit<TaxSnapshotEntity, "id" | "version" | "createdAt" | "updatedAt">
  ): Promise<TaxSnapshotEntity>;

  /**
   * Find existing snapshot by source
   */
  abstract findBySource(
    tenantId: string,
    sourceType: TaxSourceType,
    sourceId: string
  ): Promise<TaxSnapshotEntity | null>;

  /**
   * List snapshots for a period (for VAT reporting)
   */
  abstract findByPeriod(
    tenantId: string,
    start: Date,
    end: Date,
    sourceType?: TaxSourceType
  ): Promise<TaxSnapshotEntity[]>;
}
