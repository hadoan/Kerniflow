import { z } from "zod";
import { QuoteDtoSchema, QuoteStatusSchema } from "./quote.types";
import { localDateSchema } from "../shared/local-date.schema";

export const ListQuotesInputSchema = z.object({
  status: QuoteStatusSchema.optional(),
  customerPartyId: z.string().optional(),
  fromDate: localDateSchema.optional(),
  toDate: localDateSchema.optional(),
  cursor: z.string().optional(),
  pageSize: z.number().int().positive().max(100).optional(),
});

export const ListQuotesOutputSchema = z.object({
  items: z.array(QuoteDtoSchema),
  nextCursor: z.string().nullable().optional(),
});

export type ListQuotesInput = z.infer<typeof ListQuotesInputSchema>;
export type ListQuotesOutput = z.infer<typeof ListQuotesOutputSchema>;
