import { z } from "zod";
import {
  TaxCountrySchema,
  TaxRegimeSchema,
  VatFilingFrequencySchema,
  TaxProfileDtoSchema,
} from "./tax.types";

/**
 * Upsert Tax Profile Input
 * Creates or updates tenant's tax configuration
 */
export const UpsertTaxProfileInputSchema = z.object({
  country: TaxCountrySchema,
  regime: TaxRegimeSchema,
  vatId: z.string().optional().nullable(),
  currency: z.string().default("EUR"),
  filingFrequency: VatFilingFrequencySchema,
  effectiveFrom: z.string().datetime(),
  effectiveTo: z.string().datetime().optional().nullable(),
  idempotencyKey: z.string().optional(),
});

export const UpsertTaxProfileOutputSchema = z.object({
  profile: TaxProfileDtoSchema,
});

export type UpsertTaxProfileInput = z.infer<typeof UpsertTaxProfileInputSchema>;
export type UpsertTaxProfileOutput = z.infer<typeof UpsertTaxProfileOutputSchema>;
