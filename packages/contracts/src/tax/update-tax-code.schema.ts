import { z } from "zod";
import { TaxCodeKindSchema, TaxCodeDtoSchema } from "./tax.types";

/**
 * Update Tax Code Input
 * Updates an existing tax code
 */
export const UpdateTaxCodeInputSchema = z.object({
  label: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
  kind: TaxCodeKindSchema.optional(),
  idempotencyKey: z.string().optional(),
});

export const UpdateTaxCodeOutputSchema = z.object({
  code: TaxCodeDtoSchema,
});

export type UpdateTaxCodeInput = z.infer<typeof UpdateTaxCodeInputSchema>;
export type UpdateTaxCodeOutput = z.infer<typeof UpdateTaxCodeOutputSchema>;
