import { z } from "zod";
import { InvoiceLineInputSchema } from "./create-invoice.schema";
import { localDateSchema } from "../shared/local-date.schema";
import { InvoiceDtoSchema } from "./invoice.types";

export const CreateInvoiceFromCustomerInputSchema = z.object({
  customerQuery: z.string().trim().min(1),
  currency: z.string().optional(),
  notes: z.string().optional(),
  terms: z.string().optional(),
  invoiceDate: localDateSchema.optional(),
  dueDate: localDateSchema.optional(),
  lineItems: z.array(InvoiceLineInputSchema).optional(),
  idempotencyKey: z.string().optional(),
});

export const CreateInvoiceFromCustomerOutputSchema = z.object({
  ok: z.boolean(),
  invoice: InvoiceDtoSchema.optional(),
  customer: z
    .object({
      id: z.string(),
      displayName: z.string(),
    })
    .optional(),
  code: z.string().optional(),
  message: z.string().optional(),
  details: z.record(z.string(), z.any()).optional(),
});

export type CreateInvoiceFromCustomerInput = z.infer<typeof CreateInvoiceFromCustomerInputSchema>;
export type CreateInvoiceFromCustomerOutput = z.infer<typeof CreateInvoiceFromCustomerOutputSchema>;
