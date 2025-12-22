import { TaxRateRepoPort } from "../../domain/ports";
import type { TaxRateEntity } from "../../domain/entities";
import { TaxRate } from "../../domain/entities";

export class InMemoryTaxRateRepo extends TaxRateRepoPort {
  private rates: TaxRateEntity[] = [];

  async create(
    rate: Omit<TaxRateEntity, "id" | "createdAt" | "updatedAt">
  ): Promise<TaxRateEntity> {
    const entity: TaxRateEntity = {
      ...rate,
      id: `rate-${this.rates.length + 1}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.rates.push(entity);
    return entity;
  }

  async findEffectiveRate(
    taxCodeId: string,
    tenantId: string,
    at: Date
  ): Promise<TaxRateEntity | null> {
    const effectiveRates = this.rates.filter(
      (r) => r.taxCodeId === taxCodeId && r.tenantId === tenantId && TaxRate.isEffective(r, at)
    );

    // Return most recent effective rate
    effectiveRates.sort((a, b) => b.effectiveFrom.getTime() - a.effectiveFrom.getTime());
    return effectiveRates[0] || null;
  }

  async findByTaxCode(taxCodeId: string, tenantId: string): Promise<TaxRateEntity[]> {
    return this.rates.filter((r) => r.taxCodeId === taxCodeId && r.tenantId === tenantId);
  }

  async update(
    id: string,
    tenantId: string,
    updates: Partial<Pick<TaxRateEntity, "rateBps" | "effectiveTo">>
  ): Promise<TaxRateEntity> {
    const rate = this.rates.find((r) => r.id === id && r.tenantId === tenantId);
    if (!rate) throw new Error("Rate not found");

    Object.assign(rate, updates, { updatedAt: new Date() });
    return rate;
  }

  // Test helper
  reset(): void {
    this.rates = [];
  }
}
