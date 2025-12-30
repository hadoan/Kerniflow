import type { TaxSourceType, TaxRegime, TaxRoundingMode } from "@corely/contracts";

export interface TaxSnapshotEntity {
  id: string;
  tenantId: string;
  sourceType: TaxSourceType;
  sourceId: string;
  jurisdiction: string;
  regime: TaxRegime;
  roundingMode: TaxRoundingMode;
  currency: string;
  calculatedAt: Date;
  subtotalAmountCents: number;
  taxTotalAmountCents: number;
  totalAmountCents: number;
  breakdownJson: string; // stringified TaxBreakdownDto
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export class TaxSnapshot {
  /**
   * Create immutable snapshot from calculation
   */
  static create(params: {
    tenantId: string;
    sourceType: TaxSourceType;
    sourceId: string;
    jurisdiction: string;
    regime: TaxRegime;
    roundingMode: TaxRoundingMode;
    currency: string;
    calculatedAt: Date;
    subtotalAmountCents: number;
    taxTotalAmountCents: number;
    totalAmountCents: number;
    breakdownJson: string;
  }): Omit<TaxSnapshotEntity, "id" | "version" | "createdAt" | "updatedAt"> {
    return {
      ...params,
    };
  }

  /**
   * Check if snapshot matches source
   */
  static matchesSource(
    snapshot: TaxSnapshotEntity,
    sourceType: TaxSourceType,
    sourceId: string
  ): boolean {
    return snapshot.sourceType === sourceType && snapshot.sourceId === sourceId;
  }
}
