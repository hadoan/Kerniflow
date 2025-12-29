import { z } from "zod";
import { SalesPaymentSchema, SalesInvoiceDtoSchema, PaymentMethodSchema } from "./invoice.types";
import { localDateSchema } from "../shared/local-date.schema";

export const RecordPaymentInputSchema = z.object({
  invoiceId: z.string(),
  amountCents: z.number().int().positive(),
  currency: z.string(),
  paymentDate: localDateSchema,
  method: PaymentMethodSchema,
  reference: z.string().optional(),
  notes: z.string().optional(),
  bankAccountId: z.string().optional(),
  idempotencyKey: z.string().optional(),
});

export const RecordPaymentOutputSchema = z.object({
  payment: SalesPaymentSchema,
  invoice: SalesInvoiceDtoSchema,
});

export type RecordPaymentInput = z.infer<typeof RecordPaymentInputSchema>;
export type RecordPaymentOutput = z.infer<typeof RecordPaymentOutputSchema>;
