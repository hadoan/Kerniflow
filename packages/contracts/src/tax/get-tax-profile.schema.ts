import { z } from "zod";
import { TaxProfileDtoSchema } from "./tax.types";

/**
 * Get Tax Profile
 * Retrieves the active tax profile for the tenant
 */
export const GetTaxProfileOutputSchema = z.object({
  profile: TaxProfileDtoSchema.nullable(),
});

export type GetTaxProfileOutput = z.infer<typeof GetTaxProfileOutputSchema>;
