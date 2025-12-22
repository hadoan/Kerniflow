import { z } from "zod";
import { VatPeriodSummaryDtoSchema } from "./tax.types";

/**
 * Get VAT Period Summary
 * Retrieves aggregated tax data for a specific period
 */
export const GetVatPeriodSummaryInputSchema = z.object({
  periodStart: z.string().datetime(),
  periodEnd: z.string().datetime(),
});

export const GetVatPeriodSummaryOutputSchema = z.object({
  summary: VatPeriodSummaryDtoSchema.nullable(),
});

export type GetVatPeriodSummaryInput = z.infer<typeof GetVatPeriodSummaryInputSchema>;
export type GetVatPeriodSummaryOutput = z.infer<typeof GetVatPeriodSummaryOutputSchema>;
