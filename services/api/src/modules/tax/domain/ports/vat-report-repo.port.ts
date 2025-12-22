import type { VatPeriodSummaryEntity } from "../entities";

export abstract class VatReportRepoPort {
  /**
   * Create or update period summary
   */
  abstract upsert(
    summary: Omit<VatPeriodSummaryEntity, "id" | "createdAt" | "updatedAt">
  ): Promise<VatPeriodSummaryEntity>;

  /**
   * Find summary for specific period
   */
  abstract findByPeriod(
    tenantId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<VatPeriodSummaryEntity | null>;

  /**
   * List all summaries for tenant (optionally filtered by date range)
   */
  abstract findAll(tenantId: string, from?: Date, to?: Date): Promise<VatPeriodSummaryEntity[]>;

  /**
   * Finalize a period (lock it)
   */
  abstract finalize(id: string, tenantId: string): Promise<VatPeriodSummaryEntity>;
}
