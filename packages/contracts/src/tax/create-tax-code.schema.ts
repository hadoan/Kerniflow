import { z } from "zod";
import { TaxCodeKindSchema, TaxCodeDtoSchema } from "./tax.types";

/**
 * Create Tax Code Input
 * Defines a new tax classification for the tenant
 */
export const CreateTaxCodeInputSchema = z.object({
  code: z.string().min(1),
  kind: TaxCodeKindSchema,
  label: z.string().min(1),
  isActive: z.boolean().default(true),
  idempotencyKey: z.string().optional(),
});

export const CreateTaxCodeOutputSchema = z.object({
  code: TaxCodeDtoSchema,
});

export type CreateTaxCodeInput = z.infer<typeof CreateTaxCodeInputSchema>;
export type CreateTaxCodeOutput = z.infer<typeof CreateTaxCodeOutputSchema>;
