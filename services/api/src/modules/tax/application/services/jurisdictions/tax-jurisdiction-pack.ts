import type {
  TaxCodeKind,
  TaxLineInput,
  CustomerTaxInfo,
  TaxBreakdownDto,
  TaxRegime,
} from "@kerniflow/contracts";

/**
 * Parameters for applying jurisdiction-specific tax rules
 */
export interface ApplyRulesParams {
  regime: TaxRegime;
  documentDate: Date;
  currency: string;
  customer: CustomerTaxInfo | null | undefined;
  lines: TaxLineInput[];
  tenantId: string;
}

/**
 * Jurisdiction-specific tax calculation pack
 * Provides interface for pluggable tax logic by country/region
 */
export abstract class TaxJurisdictionPack {
  abstract readonly code: string; // e.g., "DE", "AT", "CH"

  /**
   * Get rate in basis points for a tax code kind at a specific date
   * Returns 0 for EXEMPT, ZERO, REVERSE_CHARGE
   */
  abstract getRateBps(
    taxCodeKindOrId: string,
    documentDate: Date,
    tenantId: string
  ): Promise<number>;

  /**
   * Apply jurisdiction-specific rules and calculate tax breakdown
   */
  abstract applyRules(params: ApplyRulesParams): Promise<TaxBreakdownDto>;

  /**
   * Optional: Infer tax code kind from customer/line data
   * (For future use in v2+)
   */
  inferKindOrCode?(customer: CustomerTaxInfo | null, lineData: any): TaxCodeKind | null;
}
