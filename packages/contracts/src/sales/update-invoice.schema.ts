import { z } from "zod";
import { SalesInvoiceDtoSchema } from "./invoice.types";
import { SalesInvoiceLineInputSchema } from "./create-invoice.schema";
import { localDateSchema } from "../shared/local-date.schema";

export const SalesInvoiceHeaderPatchSchema = z.object({
  customerPartyId: z.string().optional(),
  customerContactPartyId: z.string().optional(),
  issueDate: localDateSchema.optional(),
  dueDate: localDateSchema.optional(),
  currency: z.string().optional(),
  paymentTerms: z.string().optional(),
  notes: z.string().optional(),
});

export const SalesInvoiceLinePatchSchema = SalesInvoiceLineInputSchema.extend({
  id: z.string().optional(),
});

export const UpdateSalesInvoiceInputSchema = z.object({
  invoiceId: z.string(),
  headerPatch: SalesInvoiceHeaderPatchSchema.optional(),
  lineItems: z.array(SalesInvoiceLinePatchSchema).optional(),
  idempotencyKey: z.string().optional(),
});

export const UpdateSalesInvoiceOutputSchema = z.object({
  invoice: SalesInvoiceDtoSchema,
});

export type UpdateSalesInvoiceInput = z.infer<typeof UpdateSalesInvoiceInputSchema>;
export type UpdateSalesInvoiceOutput = z.infer<typeof UpdateSalesInvoiceOutputSchema>;
