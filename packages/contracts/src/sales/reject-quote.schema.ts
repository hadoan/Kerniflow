import { z } from "zod";
import { QuoteDtoSchema } from "./quote.types";

export const RejectQuoteInputSchema = z.object({
  quoteId: z.string(),
  reason: z.string().optional(),
  idempotencyKey: z.string().optional(),
});

export const RejectQuoteOutputSchema = z.object({
  quote: QuoteDtoSchema,
});

export type RejectQuoteInput = z.infer<typeof RejectQuoteInputSchema>;
export type RejectQuoteOutput = z.infer<typeof RejectQuoteOutputSchema>;
