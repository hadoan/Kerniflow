import type { TaxRoundingMode } from "@corely/contracts";

/**
 * Rounding policy for tax calculations
 * Ensures deterministic rounding of monetary amounts
 */
export class RoundingPolicy {
  /**
   * Round cents amount (always round half up for consistency)
   */
  static roundCents(cents: number): number {
    return Math.round(cents);
  }

  /**
   * Calculate tax amount with rounding
   */
  static calculateTaxCents(netAmountCents: number, rateBps: number): number {
    const taxAmountExact = (netAmountCents * rateBps) / 10000;
    return this.roundCents(taxAmountExact);
  }

  /**
   * Apply rounding mode to tax calculation
   * PER_LINE: round each line's tax (default)
   * PER_DOCUMENT: sum exact tax, round total (not implemented in v1)
   */
  static applyRoundingMode(
    mode: TaxRoundingMode,
    lineTaxes: number[]
  ): { roundedTotal: number; lineRounded: number[] } {
    if (mode === "PER_LINE") {
      const lineRounded = lineTaxes.map((tax) => this.roundCents(tax));
      const roundedTotal = lineRounded.reduce((sum, tax) => sum + tax, 0);
      return { roundedTotal, lineRounded };
    }

    // PER_DOCUMENT: sum first, then round
    const exactTotal = lineTaxes.reduce((sum, tax) => sum + tax, 0);
    const roundedTotal = this.roundCents(exactTotal);

    // Distribute rounding to lines (v1: simple proportional)
    const lineRounded = lineTaxes.map((tax) => this.roundCents(tax));

    return { roundedTotal, lineRounded };
  }
}
