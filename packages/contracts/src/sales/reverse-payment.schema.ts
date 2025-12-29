import { z } from "zod";
import { SalesPaymentSchema, SalesInvoiceDtoSchema } from "./invoice.types";

export const ReversePaymentInputSchema = z.object({
  paymentId: z.string(),
  reason: z.string().optional(),
  idempotencyKey: z.string().optional(),
});

export const ReversePaymentOutputSchema = z.object({
  payment: SalesPaymentSchema,
  invoice: SalesInvoiceDtoSchema,
});

export type ReversePaymentInput = z.infer<typeof ReversePaymentInputSchema>;
export type ReversePaymentOutput = z.infer<typeof ReversePaymentOutputSchema>;
