import { z } from "zod";
import { InvoiceDtoSchema } from "./invoice.types";
import { utcInstantSchema } from "../shared/local-date.schema";

export const RecordPaymentInputSchema = z.object({
  invoiceId: z.string(),
  amountCents: z.number().int().positive(),
  paidAt: utcInstantSchema.optional(),
  note: z.string().optional(),
});

export const RecordPaymentOutputSchema = z.object({
  invoice: InvoiceDtoSchema,
});

export type RecordPaymentInput = z.infer<typeof RecordPaymentInputSchema>;
export type RecordPaymentOutput = z.infer<typeof RecordPaymentOutputSchema>;
