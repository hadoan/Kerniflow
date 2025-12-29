import { z } from "zod";
import { SalesInvoiceDtoSchema } from "./invoice.types";

export const IssueSalesInvoiceInputSchema = z.object({
  invoiceId: z.string(),
  idempotencyKey: z.string().optional(),
});

export const IssueSalesInvoiceOutputSchema = z.object({
  invoice: SalesInvoiceDtoSchema,
});

export type IssueSalesInvoiceInput = z.infer<typeof IssueSalesInvoiceInputSchema>;
export type IssueSalesInvoiceOutput = z.infer<typeof IssueSalesInvoiceOutputSchema>;
