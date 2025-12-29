import { z } from "zod";
import { SalesInvoiceDtoSchema } from "./invoice.types";

export const ConvertQuoteToInvoiceInputSchema = z.object({
  quoteId: z.string(),
  idempotencyKey: z.string().optional(),
});

export const ConvertQuoteToInvoiceOutputSchema = z.object({
  invoice: SalesInvoiceDtoSchema,
});

export type ConvertQuoteToInvoiceInput = z.infer<typeof ConvertQuoteToInvoiceInputSchema>;
export type ConvertQuoteToInvoiceOutput = z.infer<typeof ConvertQuoteToInvoiceOutputSchema>;
