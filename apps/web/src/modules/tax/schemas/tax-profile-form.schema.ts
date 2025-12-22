import { z } from "zod";
import {
  TaxCountrySchema,
  TaxRegimeSchema,
  VatFilingFrequencySchema,
  type UpsertTaxProfileInput,
} from "@kerniflow/contracts";

/**
 * Form schema for tax profile
 * Extends contract schema with Date objects for better UX
 */
export const taxProfileFormSchema = z.object({
  country: TaxCountrySchema,
  regime: TaxRegimeSchema,
  vatId: z.string().optional(),
  currency: z.string().default("EUR"),
  filingFrequency: VatFilingFrequencySchema,
  effectiveFrom: z.date(),
  effectiveTo: z.date().optional().nullable(),
});

export type TaxProfileFormData = z.infer<typeof taxProfileFormSchema>;

/**
 * Transform form data to API request format
 * Converts Date objects to ISO strings
 */
export function toUpsertTaxProfileInput(form: TaxProfileFormData): UpsertTaxProfileInput {
  return {
    country: form.country,
    regime: form.regime,
    vatId: form.vatId || undefined,
    currency: form.currency,
    filingFrequency: form.filingFrequency,
    effectiveFrom: form.effectiveFrom.toISOString(),
    effectiveTo: form.effectiveTo?.toISOString() || undefined,
  };
}

/**
 * Default values for new tax profile form
 */
export function getDefaultTaxProfileFormValues(): Partial<TaxProfileFormData> {
  return {
    country: "DE",
    regime: "STANDARD_VAT",
    currency: "EUR",
    filingFrequency: "QUARTERLY",
    effectiveFrom: new Date(),
  };
}

/**
 * Transform DTO to form data
 */
export function taxProfileDtoToFormData(dto: any): TaxProfileFormData {
  return {
    country: dto.country,
    regime: dto.regime,
    vatId: dto.vatId || undefined,
    currency: dto.currency,
    filingFrequency: dto.filingFrequency,
    effectiveFrom: new Date(dto.effectiveFrom),
    effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : undefined,
  };
}
