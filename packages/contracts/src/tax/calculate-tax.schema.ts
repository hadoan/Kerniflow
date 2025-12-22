import { z } from "zod";
import { CalculateTaxRequestSchema, TaxBreakdownDtoSchema } from "./tax.types";

/**
 * Calculate Tax
 * Computes tax breakdown for draft preview (invoice/expense)
 */
export const CalculateTaxInputSchema = CalculateTaxRequestSchema;

export const CalculateTaxOutputSchema = z.object({
  breakdown: TaxBreakdownDtoSchema,
});

export type CalculateTaxInput = z.infer<typeof CalculateTaxInputSchema>;
export type CalculateTaxOutput = z.infer<typeof CalculateTaxOutputSchema>;
