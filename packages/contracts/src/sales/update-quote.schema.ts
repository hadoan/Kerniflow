import { z } from "zod";
import { QuoteDtoSchema } from "./quote.types";
import { QuoteLineInputSchema } from "./create-quote.schema";
import { localDateSchema } from "../shared/local-date.schema";

export const QuoteHeaderPatchSchema = z.object({
  customerPartyId: z.string().optional(),
  customerContactPartyId: z.string().optional(),
  issueDate: localDateSchema.optional(),
  validUntilDate: localDateSchema.optional(),
  currency: z.string().optional(),
  paymentTerms: z.string().optional(),
  notes: z.string().optional(),
});

export const QuoteLinePatchSchema = QuoteLineInputSchema.extend({
  id: z.string().optional(),
});

export const UpdateQuoteInputSchema = z.object({
  quoteId: z.string(),
  headerPatch: QuoteHeaderPatchSchema.optional(),
  lineItems: z.array(QuoteLinePatchSchema).optional(),
  idempotencyKey: z.string().optional(),
});

export const UpdateQuoteOutputSchema = z.object({
  quote: QuoteDtoSchema,
});

export type UpdateQuoteInput = z.infer<typeof UpdateQuoteInputSchema>;
export type UpdateQuoteOutput = z.infer<typeof UpdateQuoteOutputSchema>;
