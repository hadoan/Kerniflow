import { z } from "zod";
import { SalesInvoiceDtoSchema } from "./invoice.types";

export const VoidSalesInvoiceInputSchema = z.object({
  invoiceId: z.string(),
  reason: z.string().optional(),
  idempotencyKey: z.string().optional(),
});

export const VoidSalesInvoiceOutputSchema = z.object({
  invoice: SalesInvoiceDtoSchema,
});

export type VoidSalesInvoiceInput = z.infer<typeof VoidSalesInvoiceInputSchema>;
export type VoidSalesInvoiceOutput = z.infer<typeof VoidSalesInvoiceOutputSchema>;
