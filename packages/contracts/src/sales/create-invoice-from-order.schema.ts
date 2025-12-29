import { z } from "zod";
import { SalesInvoiceDtoSchema } from "./invoice.types";

export const CreateInvoiceFromOrderInputSchema = z.object({
  orderId: z.string(),
  idempotencyKey: z.string().optional(),
});

export const CreateInvoiceFromOrderOutputSchema = z.object({
  invoice: SalesInvoiceDtoSchema,
});

export type CreateInvoiceFromOrderInput = z.infer<typeof CreateInvoiceFromOrderInputSchema>;
export type CreateInvoiceFromOrderOutput = z.infer<typeof CreateInvoiceFromOrderOutputSchema>;
