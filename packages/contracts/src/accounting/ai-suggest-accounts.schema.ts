import { z } from "zod";
import { ConfidenceLevelSchema, LineDirectionSchema } from "./enums";
import { ProvenanceSummarySchema } from "./ai-interaction.types";

export const SuggestAccountsInputSchema = z.object({
  memo: z.string(),
  amountCents: z.number().int().positive(),
  currency: z.string(),
  counterpartyName: z.string().optional(),
  contextDate: z.string().optional(), // LocalDate YYYY-MM-DD
  directionHint: LineDirectionSchema.optional(),
  idempotencyKey: z.string().optional(),
});

export type SuggestAccountsInput = z.infer<typeof SuggestAccountsInputSchema>;

export const AccountSuggestionSchema = z.object({
  ledgerAccountId: z.string(),
  ledgerAccountCode: z.string(),
  ledgerAccountName: z.string(),
  proposedDirection: LineDirectionSchema,
  confidence: ConfidenceLevelSchema,
  confidenceScore: z.number().min(0).max(1),
  rationale: z.string(),
  provenance: z.string(),
});

export type AccountSuggestion = z.infer<typeof AccountSuggestionSchema>;

export const SuggestAccountsOutputSchema = z.object({
  topSuggestions: z.array(AccountSuggestionSchema),
  provenance: ProvenanceSummarySchema,
  aiInteractionId: z.string(),
});

export type SuggestAccountsOutput = z.infer<typeof SuggestAccountsOutputSchema>;
