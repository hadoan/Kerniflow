import { z } from "zod";

// ============================================================================
// Enums
// ============================================================================

export const TaxCountrySchema = z.enum(["DE"]);
export type TaxCountry = z.infer<typeof TaxCountrySchema>;

export const TaxRegimeSchema = z.enum(["SMALL_BUSINESS", "STANDARD_VAT"]);
export type TaxRegime = z.infer<typeof TaxRegimeSchema>;

export const TaxCodeKindSchema = z.enum([
  "STANDARD",
  "REDUCED",
  "REVERSE_CHARGE",
  "EXEMPT",
  "ZERO",
]);
export type TaxCodeKind = z.infer<typeof TaxCodeKindSchema>;

export const TaxRoundingModeSchema = z.enum(["PER_LINE", "PER_DOCUMENT"]);
export type TaxRoundingMode = z.infer<typeof TaxRoundingModeSchema>;

export const TaxSourceTypeSchema = z.enum(["INVOICE", "EXPENSE"]);
export type TaxSourceType = z.infer<typeof TaxSourceTypeSchema>;

export const VatFilingFrequencySchema = z.enum(["MONTHLY", "QUARTERLY", "YEARLY"]);
export type VatFilingFrequency = z.infer<typeof VatFilingFrequencySchema>;

export const VatPeriodStatusSchema = z.enum(["OPEN", "FINALIZED"]);
export type VatPeriodStatus = z.infer<typeof VatPeriodStatusSchema>;

// ============================================================================
// DTOs (wire format - ISO strings for dates)
// ============================================================================

/**
 * Tax Profile DTO
 * Defines tenant's tax configuration for a jurisdiction
 */
export const TaxProfileDtoSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  country: TaxCountrySchema,
  regime: TaxRegimeSchema,
  vatId: z.string().optional().nullable(),
  currency: z.string().default("EUR"),
  filingFrequency: VatFilingFrequencySchema,
  effectiveFrom: z.string().datetime(),
  effectiveTo: z.string().datetime().optional().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type TaxProfileDto = z.infer<typeof TaxProfileDtoSchema>;

/**
 * Tax Code DTO
 * Defines a tax classification (e.g., "STANDARD_VAT_19", "REDUCED_VAT_7")
 */
export const TaxCodeDtoSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  code: z.string(),
  kind: TaxCodeKindSchema,
  label: z.string(),
  isActive: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type TaxCodeDto = z.infer<typeof TaxCodeDtoSchema>;

/**
 * Tax Rate DTO
 * Effective-dated rate for a tax code
 */
export const TaxRateDtoSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  taxCodeId: z.string(),
  rateBps: z.number().int().min(0).max(10000), // basis points (e.g., 1900 = 19%)
  effectiveFrom: z.string().datetime(),
  effectiveTo: z.string().datetime().optional().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type TaxRateDto = z.infer<typeof TaxRateDtoSchema>;

// ============================================================================
// Calculation Schemas
// ============================================================================

/**
 * Line item input for tax calculation
 * Used for invoice/expense draft preview
 */
export const TaxLineInputSchema = z.object({
  id: z.string().optional(), // line id from source document
  description: z.string().optional(),
  qty: z.number().positive(),
  netAmountCents: z.number().int().nonnegative(),
  taxCodeId: z.string().optional().nullable(), // manual override
});
export type TaxLineInput = z.infer<typeof TaxLineInputSchema>;

/**
 * Customer tax information for calculation
 */
export const CustomerTaxInfoSchema = z.object({
  country: z.string().min(2).max(2), // ISO 2-letter code
  isBusiness: z.boolean().default(false),
  vatId: z.string().optional().nullable(),
});
export type CustomerTaxInfo = z.infer<typeof CustomerTaxInfoSchema>;

/**
 * Tax calculation request
 * Used by invoice/expense modules for draft preview
 */
export const CalculateTaxRequestSchema = z.object({
  jurisdiction: z.string().default("DE"),
  documentDate: z.string().datetime(),
  currency: z.string().default("EUR"),
  customer: CustomerTaxInfoSchema.optional().nullable(),
  lines: z.array(TaxLineInputSchema).min(1),
  idempotencyKey: z.string().optional(),
});
export type CalculateTaxRequest = z.infer<typeof CalculateTaxRequestSchema>;

/**
 * Tax calculation result for a single line
 */
export const TaxLineResultDtoSchema = z.object({
  lineId: z.string().optional().nullable(),
  taxCodeId: z.string().optional().nullable(),
  kind: TaxCodeKindSchema,
  rateBps: z.number().int(),
  netAmountCents: z.number().int(),
  taxAmountCents: z.number().int(),
  grossAmountCents: z.number().int(),
});
export type TaxLineResultDto = z.infer<typeof TaxLineResultDtoSchema>;

/**
 * Tax totals aggregated by kind
 */
export const TaxTotalsByKindSchema = z.record(
  TaxCodeKindSchema,
  z.object({
    netAmountCents: z.number().int(),
    taxAmountCents: z.number().int(),
    grossAmountCents: z.number().int(),
    rateBps: z.number().int().optional(), // effective rate for this kind
  })
);
export type TaxTotalsByKind = z.infer<typeof TaxTotalsByKindSchema>;

/**
 * Complete tax breakdown result
 */
export const TaxBreakdownDtoSchema = z.object({
  subtotalAmountCents: z.number().int(),
  taxTotalAmountCents: z.number().int(),
  totalAmountCents: z.number().int(),
  roundingMode: TaxRoundingModeSchema,
  lines: z.array(TaxLineResultDtoSchema),
  totalsByKind: TaxTotalsByKindSchema,
  flags: z.object({
    needsReverseChargeNote: z.boolean(),
    isSmallBusinessNoVatCharged: z.boolean(),
  }),
});
export type TaxBreakdownDto = z.infer<typeof TaxBreakdownDtoSchema>;

// ============================================================================
// Snapshot DTO (immutable tax calculation)
// ============================================================================

/**
 * Tax Snapshot DTO
 * Immutable record of tax calculation for finalized documents
 */
export const TaxSnapshotDtoSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  sourceType: TaxSourceTypeSchema,
  sourceId: z.string(),
  jurisdiction: z.string(),
  regime: TaxRegimeSchema,
  roundingMode: TaxRoundingModeSchema,
  currency: z.string(),
  calculatedAt: z.string().datetime(),

  // Breakdown
  subtotalAmountCents: z.number().int(),
  taxTotalAmountCents: z.number().int(),
  totalAmountCents: z.number().int(),

  // Full breakdown stored as JSON
  breakdownJson: z.string(), // stringified TaxBreakdownDto

  version: z.number().int().default(1),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type TaxSnapshotDto = z.infer<typeof TaxSnapshotDtoSchema>;

// ============================================================================
// VAT Report DTOs
// ============================================================================

/**
 * VAT Period Summary DTO
 * Aggregated tax data for a reporting period
 */
export const VatPeriodSummaryDtoSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  periodStart: z.string().datetime(),
  periodEnd: z.string().datetime(),
  currency: z.string(),
  totalsByKind: TaxTotalsByKindSchema,
  generatedAt: z.string().datetime(),
  status: VatPeriodStatusSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type VatPeriodSummaryDto = z.infer<typeof VatPeriodSummaryDtoSchema>;
