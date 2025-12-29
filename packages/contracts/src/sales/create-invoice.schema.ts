import { z } from "zod";
import { SalesInvoiceDtoSchema } from "./invoice.types";
import { localDateSchema } from "../shared/local-date.schema";

export const SalesInvoiceLineInputSchema = z.object({
  description: z.string(),
  quantity: z.number().positive(),
  unitPriceCents: z.number().int().nonnegative(),
  discountCents: z.number().int().nonnegative().optional(),
  taxCode: z.string().optional(),
  revenueCategory: z.string().optional(),
  sortOrder: z.number().int().nonnegative().optional(),
});

export const CreateSalesInvoiceInputSchema = z.object({
  customerPartyId: z.string(),
  customerContactPartyId: z.string().optional(),
  issueDate: localDateSchema.optional(),
  dueDate: localDateSchema.optional(),
  currency: z.string(),
  paymentTerms: z.string().optional(),
  notes: z.string().optional(),
  lineItems: z.array(SalesInvoiceLineInputSchema).min(1),
  sourceSalesOrderId: z.string().optional(),
  sourceQuoteId: z.string().optional(),
  idempotencyKey: z.string().optional(),
});

export const CreateSalesInvoiceOutputSchema = z.object({
  invoice: SalesInvoiceDtoSchema,
});

export type SalesInvoiceLineInput = z.infer<typeof SalesInvoiceLineInputSchema>;
export type CreateSalesInvoiceInput = z.infer<typeof CreateSalesInvoiceInputSchema>;
export type CreateSalesInvoiceOutput = z.infer<typeof CreateSalesInvoiceOutputSchema>;
