import { z } from "zod";
import { TaxRateDtoSchema } from "./tax.types";

/**
 * List Tax Rates
 * Retrieves all rates for a specific tax code
 */
export const ListTaxRatesInputSchema = z.object({
  taxCodeId: z.string(),
});

export const ListTaxRatesOutputSchema = z.object({
  rates: z.array(TaxRateDtoSchema),
});

export type ListTaxRatesInput = z.infer<typeof ListTaxRatesInputSchema>;
export type ListTaxRatesOutput = z.infer<typeof ListTaxRatesOutputSchema>;
