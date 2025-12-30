import type { VatPeriodStatus, TaxBreakdownDto } from "@corely/contracts";

export interface VatPeriodSummaryEntity {
  id: string;
  tenantId: string;
  periodStart: Date;
  periodEnd: Date;
  currency: string;
  totalsByKindJson: string; // stringified TaxTotalsByKind
  generatedAt: Date;
  status: VatPeriodStatus;
  createdAt: Date;
  updatedAt: Date;
}

export class VatPeriodSummary {
  /**
   * Create new period summary
   */
  static create(params: {
    tenantId: string;
    periodStart: Date;
    periodEnd: Date;
    currency: string;
    totalsByKindJson: string;
    generatedAt: Date;
  }): Omit<VatPeriodSummaryEntity, "id" | "createdAt" | "updatedAt"> {
    return {
      ...params,
      status: "OPEN",
    };
  }

  /**
   * Apply breakdown to update totals
   */
  static applyBreakdown(
    summary: VatPeriodSummaryEntity,
    breakdown: TaxBreakdownDto
  ): VatPeriodSummaryEntity {
    // This would aggregate the breakdown into the existing totals
    // For v1, we'll regenerate the entire summary
    return summary;
  }

  /**
   * Finalize period (lock for reporting)
   */
  static finalize(summary: VatPeriodSummaryEntity): VatPeriodSummaryEntity {
    return {
      ...summary,
      status: "FINALIZED",
    };
  }

  /**
   * Check if period can be modified
   */
  static canModify(summary: VatPeriodSummaryEntity): boolean {
    return summary.status === "OPEN";
  }
}
