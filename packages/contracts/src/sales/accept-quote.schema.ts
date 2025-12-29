import { z } from "zod";
import { QuoteDtoSchema } from "./quote.types";

export const AcceptQuoteInputSchema = z.object({
  quoteId: z.string(),
  idempotencyKey: z.string().optional(),
});

export const AcceptQuoteOutputSchema = z.object({
  quote: QuoteDtoSchema,
});

export type AcceptQuoteInput = z.infer<typeof AcceptQuoteInputSchema>;
export type AcceptQuoteOutput = z.infer<typeof AcceptQuoteOutputSchema>;
