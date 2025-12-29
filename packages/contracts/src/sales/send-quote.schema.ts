import { z } from "zod";
import { QuoteDtoSchema } from "./quote.types";

export const SendQuoteInputSchema = z.object({
  quoteId: z.string(),
  idempotencyKey: z.string().optional(),
});

export const SendQuoteOutputSchema = z.object({
  quote: QuoteDtoSchema,
});

export type SendQuoteInput = z.infer<typeof SendQuoteInputSchema>;
export type SendQuoteOutput = z.infer<typeof SendQuoteOutputSchema>;
