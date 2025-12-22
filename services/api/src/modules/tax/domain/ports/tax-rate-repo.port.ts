import type { TaxRateEntity } from "../entities";

export abstract class TaxRateRepoPort {
  /**
   * Create new tax rate
   */
  abstract create(
    rate: Omit<TaxRateEntity, "id" | "createdAt" | "updatedAt">
  ): Promise<TaxRateEntity>;

  /**
   * Find rate effective at a specific date
   */
  abstract findEffectiveRate(
    taxCodeId: string,
    tenantId: string,
    at: Date
  ): Promise<TaxRateEntity | null>;

  /**
   * List all rates for a tax code
   */
  abstract findByTaxCode(taxCodeId: string, tenantId: string): Promise<TaxRateEntity[]>;

  /**
   * Update tax rate
   */
  abstract update(
    id: string,
    tenantId: string,
    updates: Partial<Pick<TaxRateEntity, "rateBps" | "effectiveTo">>
  ): Promise<TaxRateEntity>;
}
