import { z } from "zod";
import { VatPeriodSummaryDtoSchema } from "./tax.types";

/**
 * List VAT Periods
 * Retrieves all VAT period summaries with optional date filtering
 */
export const ListVatPeriodsInputSchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

export const ListVatPeriodsOutputSchema = z.object({
  periods: z.array(VatPeriodSummaryDtoSchema),
});

export type ListVatPeriodsInput = z.infer<typeof ListVatPeriodsInputSchema>;
export type ListVatPeriodsOutput = z.infer<typeof ListVatPeriodsOutputSchema>;
