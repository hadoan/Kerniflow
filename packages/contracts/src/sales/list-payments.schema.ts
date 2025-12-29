import { z } from "zod";
import { SalesPaymentSchema } from "./invoice.types";

export const ListPaymentsInputSchema = z.object({
  invoiceId: z.string(),
});

export const ListPaymentsOutputSchema = z.object({
  items: z.array(SalesPaymentSchema),
});

export type ListPaymentsInput = z.infer<typeof ListPaymentsInputSchema>;
export type ListPaymentsOutput = z.infer<typeof ListPaymentsOutputSchema>;
