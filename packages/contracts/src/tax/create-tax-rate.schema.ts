import { z } from "zod";
import { TaxRateDtoSchema } from "./tax.types";

/**
 * Create Tax Rate Input
 * Defines a new effective-dated rate for a tax code
 */
export const CreateTaxRateInputSchema = z.object({
  taxCodeId: z.string(),
  rateBps: z.number().int().min(0).max(10000),
  effectiveFrom: z.string().datetime(),
  effectiveTo: z.string().datetime().optional().nullable(),
  idempotencyKey: z.string().optional(),
});

export const CreateTaxRateOutputSchema = z.object({
  rate: TaxRateDtoSchema,
});

export type CreateTaxRateInput = z.infer<typeof CreateTaxRateInputSchema>;
export type CreateTaxRateOutput = z.infer<typeof CreateTaxRateOutputSchema>;
