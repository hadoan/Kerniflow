import type { TemplateDefinition } from "@corely/contracts";
import { z } from "zod";

/**
 * California Sales Tax Template Definition
 * Provides standard California sales tax rates by jurisdiction
 */

// Template parameters schema
export const SalesTaxCaParamsSchema = z.object({
  includeLocalRates: z
    .boolean()
    .default(true)
    .describe("Include local/district rates (cities, counties)"),
  effectiveDate: z
    .string()
    .optional()
    .describe("Effective date for tax rates (ISO format). Defaults to current date."),
});

export type SalesTaxCaParams = z.infer<typeof SalesTaxCaParamsSchema>;

// Template definition
export const salesTaxCaTemplate: TemplateDefinition = {
  templateId: "sales-tax-ca",
  name: "California Sales Tax Rates",
  category: "tax",
  version: "1.0.0",
  description:
    "Standard California sales tax rates including state base rate and common local jurisdictions",
  requiresApps: ["tax"],
  paramsSchema: SalesTaxCaParamsSchema,
  upgradePolicy: {
    skipCustomized: true,
    additiveOnly: false,
  },
};

/**
 * Tax Rate Record
 */
export interface TaxRateRecord {
  code: string; // Stable key for idempotency
  name: string;
  jurisdiction: string;
  rate: number; // Decimal rate (e.g., 0.0725 for 7.25%)
  type: "STATE" | "COUNTY" | "CITY" | "DISTRICT";
  effectiveDate: string;
  expiryDate: string | null;
  isActive: boolean;
}

/**
 * Standard California Sales Tax Rates
 * Base state rate + common local rates
 * Note: Real-world implementation should use actual rate data from authorities
 */
export function getCaSalesTaxRates(params: SalesTaxCaParams): TaxRateRecord[] {
  const { includeLocalRates, effectiveDate } = params;
  const effective = effectiveDate || new Date().toISOString().split("T")[0];

  const rates: TaxRateRecord[] = [
    // Base California state sales tax
    {
      code: "CA-STATE",
      name: "California State Sales Tax",
      jurisdiction: "California",
      rate: 0.0725, // 7.25% base rate
      type: "STATE",
      effectiveDate: effective,
      expiryDate: null,
      isActive: true,
    },
  ];

  // Add common local rates if requested
  if (includeLocalRates) {
    rates.push(
      // Los Angeles County
      {
        code: "CA-LA-COUNTY",
        name: "Los Angeles County Sales Tax",
        jurisdiction: "Los Angeles County",
        rate: 0.0025, // Additional 0.25%
        type: "COUNTY",
        effectiveDate: effective,
        expiryDate: null,
        isActive: true,
      },
      {
        code: "CA-LA-CITY",
        name: "Los Angeles City Sales Tax",
        jurisdiction: "Los Angeles",
        rate: 0.01, // Additional 1%
        type: "CITY",
        effectiveDate: effective,
        expiryDate: null,
        isActive: true,
      },

      // San Francisco
      {
        code: "CA-SF-COUNTY",
        name: "San Francisco County Sales Tax",
        jurisdiction: "San Francisco County",
        rate: 0.0025, // Additional 0.25%
        type: "COUNTY",
        effectiveDate: effective,
        expiryDate: null,
        isActive: true,
      },

      // San Diego County
      {
        code: "CA-SD-COUNTY",
        name: "San Diego County Sales Tax",
        jurisdiction: "San Diego County",
        rate: 0.0025, // Additional 0.25%
        type: "COUNTY",
        effectiveDate: effective,
        expiryDate: null,
        isActive: true,
      },

      // Santa Clara County (Silicon Valley)
      {
        code: "CA-SC-COUNTY",
        name: "Santa Clara County Sales Tax",
        jurisdiction: "Santa Clara County",
        rate: 0.00125, // Additional 0.125%
        type: "COUNTY",
        effectiveDate: effective,
        expiryDate: null,
        isActive: true,
      },

      // Sacramento
      {
        code: "CA-SAC-COUNTY",
        name: "Sacramento County Sales Tax",
        jurisdiction: "Sacramento County",
        rate: 0.005, // Additional 0.5%
        type: "COUNTY",
        effectiveDate: effective,
        expiryDate: null,
        isActive: true,
      }
    );
  }

  return rates;
}
