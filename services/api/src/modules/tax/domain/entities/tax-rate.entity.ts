export interface TaxRateEntity {
  id: string;
  tenantId: string;
  taxCodeId: string;
  rateBps: number; // basis points (e.g., 1900 = 19%)
  effectiveFrom: Date;
  effectiveTo: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export class TaxRate {
  /**
   * Check if rate is effective at a given date
   */
  static isEffective(rate: TaxRateEntity, at: Date): boolean {
    const isAfterStart = at >= rate.effectiveFrom;
    const isBeforeEnd = !rate.effectiveTo || at <= rate.effectiveTo;

    return isAfterStart && isBeforeEnd;
  }

  /**
   * Convert basis points to decimal (e.g., 1900 -> 0.19)
   */
  static toDecimal(rateBps: number): number {
    return rateBps / 10000;
  }

  /**
   * Convert decimal to basis points (e.g., 0.19 -> 1900)
   */
  static fromDecimal(decimal: number): number {
    return Math.round(decimal * 10000);
  }

  /**
   * Calculate tax amount from net amount
   */
  static calculateTaxCents(netAmountCents: number, rateBps: number): number {
    const decimal = TaxRate.toDecimal(rateBps);
    return Math.round(netAmountCents * decimal);
  }
}
