import { z } from "zod";
import { QuoteDtoSchema } from "./quote.types";

export const GetQuoteInputSchema = z.object({
  quoteId: z.string(),
});

export const GetQuoteOutputSchema = z.object({
  quote: QuoteDtoSchema,
});

export type GetQuoteInput = z.infer<typeof GetQuoteInputSchema>;
export type GetQuoteOutput = z.infer<typeof GetQuoteOutputSchema>;
