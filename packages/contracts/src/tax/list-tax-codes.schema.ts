import { z } from "zod";
import { TaxCodeDtoSchema } from "./tax.types";

/**
 * List Tax Codes
 * Retrieves all tax codes for the tenant
 */
export const ListTaxCodesOutputSchema = z.object({
  codes: z.array(TaxCodeDtoSchema),
});

export type ListTaxCodesOutput = z.infer<typeof ListTaxCodesOutputSchema>;
