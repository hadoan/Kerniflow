import { z } from "zod";
import { QuoteDtoSchema } from "./quote.types";
import { localDateSchema } from "../shared/local-date.schema";

export const QuoteLineInputSchema = z.object({
  description: z.string(),
  quantity: z.number().positive(),
  unitPriceCents: z.number().int().nonnegative(),
  discountCents: z.number().int().nonnegative().optional(),
  taxCode: z.string().optional(),
  revenueCategory: z.string().optional(),
  sortOrder: z.number().int().nonnegative().optional(),
});

export const CreateQuoteInputSchema = z.object({
  customerPartyId: z.string(),
  customerContactPartyId: z.string().optional(),
  issueDate: localDateSchema.optional(),
  validUntilDate: localDateSchema.optional(),
  currency: z.string(),
  paymentTerms: z.string().optional(),
  notes: z.string().optional(),
  lineItems: z.array(QuoteLineInputSchema).min(1),
  idempotencyKey: z.string().optional(),
});

export const CreateQuoteOutputSchema = z.object({
  quote: QuoteDtoSchema,
});

export type QuoteLineInput = z.infer<typeof QuoteLineInputSchema>;
export type CreateQuoteInput = z.infer<typeof CreateQuoteInputSchema>;
export type CreateQuoteOutput = z.infer<typeof CreateQuoteOutputSchema>;
