import { z } from "zod";
import { InvoiceDtoSchema } from "./invoice.types";
import { InvoiceLineInputSchema } from "./create-invoice.schema";
import { localDateSchema } from "../shared/local-date.schema";

export const InvoiceHeaderPatchSchema = z.object({
  customerPartyId: z.string().optional(),
  currency: z.string().optional(),
  notes: z.string().optional(),
  terms: z.string().optional(),
  invoiceDate: localDateSchema.optional(),
  dueDate: localDateSchema.optional(),
});

export const InvoiceLinePatchSchema = InvoiceLineInputSchema.extend({
  id: z.string().optional(),
});

export const UpdateInvoiceInputSchema = z.object({
  invoiceId: z.string(),
  headerPatch: InvoiceHeaderPatchSchema.optional(),
  lineItems: z.array(InvoiceLinePatchSchema).optional(),
  idempotencyKey: z.string().optional(),
});

export const UpdateInvoiceOutputSchema = z.object({
  invoice: InvoiceDtoSchema,
});

export type UpdateInvoiceInput = z.infer<typeof UpdateInvoiceInputSchema>;
export type UpdateInvoiceOutput = z.infer<typeof UpdateInvoiceOutputSchema>;
