import { z } from "zod";

/**
 * Export VAT Period
 * Generates an export file for a VAT period (CSV/PDF)
 * Returns export job ID for async processing
 */
export const ExportVatPeriodInputSchema = z.object({
  periodStart: z.string().datetime(),
  periodEnd: z.string().datetime(),
  format: z.enum(["CSV", "PDF"]).default("CSV"),
  idempotencyKey: z.string().optional(),
});

export const ExportVatPeriodOutputSchema = z.object({
  exportJobId: z.string(),
});

export type ExportVatPeriodInput = z.infer<typeof ExportVatPeriodInputSchema>;
export type ExportVatPeriodOutput = z.infer<typeof ExportVatPeriodOutputSchema>;
