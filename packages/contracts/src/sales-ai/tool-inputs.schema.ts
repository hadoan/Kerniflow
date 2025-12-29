import { z } from "zod";
import { localDateSchema } from "../shared/local-date.schema";

export const SalesCreateQuoteFromTextInputSchema = z.object({
  userText: z.string().min(1),
  customerPartyId: z.string().optional(),
  currency: z.string().optional(),
  paymentTerms: z.string().optional(),
});
export type SalesCreateQuoteFromTextInput = z.infer<typeof SalesCreateQuoteFromTextInputSchema>;

export const SalesGenerateLineItemsInputSchema = z.object({
  goalText: z.string().min(1),
  budgetCents: z.number().int().positive().optional(),
});
export type SalesGenerateLineItemsInput = z.infer<typeof SalesGenerateLineItemsInputSchema>;

export const SalesPriceAssistInputSchema = z.object({
  scope: z.string().min(1),
  industryContext: z.string().optional(),
  targetMarginPercent: z.number().int().min(0).max(100).optional(),
  historicalQuoteIds: z.array(z.string()).optional(),
});
export type SalesPriceAssistInput = z.infer<typeof SalesPriceAssistInputSchema>;

export const SalesSummarizeDealOrQuoteInputSchema = z
  .object({
    quoteId: z.string().optional(),
    dealId: z.string().optional(),
  })
  .refine((data) => data.quoteId || data.dealId, {
    message: "quoteId or dealId is required",
  });
export type SalesSummarizeDealOrQuoteInput = z.infer<typeof SalesSummarizeDealOrQuoteInputSchema>;

export const SalesDraftFollowUpMessageInputSchema = z
  .object({
    quoteId: z.string().optional(),
    invoiceId: z.string().optional(),
    customerPartyId: z.string().optional(),
    tone: z.string().optional(),
    objective: z.string().optional(),
  })
  .refine((data) => data.quoteId || data.invoiceId || data.customerPartyId, {
    message: "At least one context id is required",
  });
export type SalesDraftFollowUpMessageInput = z.infer<typeof SalesDraftFollowUpMessageInputSchema>;

export const SalesDetectStalledQuotesInputSchema = z.object({
  fromDate: localDateSchema.optional(),
  toDate: localDateSchema.optional(),
  minimumDaysSinceSent: z.number().int().positive().optional(),
});
export type SalesDetectStalledQuotesInput = z.infer<typeof SalesDetectStalledQuotesInputSchema>;

export const SalesExplainPostingInputSchema = z
  .object({
    invoiceId: z.string().optional(),
    paymentId: z.string().optional(),
  })
  .refine((data) => data.invoiceId || data.paymentId, {
    message: "invoiceId or paymentId is required",
  });
export type SalesExplainPostingInput = z.infer<typeof SalesExplainPostingInputSchema>;
