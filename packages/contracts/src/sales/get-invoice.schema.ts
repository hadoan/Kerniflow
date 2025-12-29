import { z } from "zod";
import { SalesInvoiceDtoSchema } from "./invoice.types";

export const GetSalesInvoiceInputSchema = z.object({
  invoiceId: z.string(),
});

export const GetSalesInvoiceOutputSchema = z.object({
  invoice: SalesInvoiceDtoSchema,
});

export type GetSalesInvoiceInput = z.infer<typeof GetSalesInvoiceInputSchema>;
export type GetSalesInvoiceOutput = z.infer<typeof GetSalesInvoiceOutputSchema>;
