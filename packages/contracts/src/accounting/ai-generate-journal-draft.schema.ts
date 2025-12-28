import { z } from "zod";
import { ConfidenceLevelSchema, LineDirectionSchema } from "./enums";
import { ProvenanceSummarySchema } from "./ai-interaction.types";

export const GenerateJournalDraftInputSchema = z.object({
  userText: z.string(),
  baseCurrency: z.string(),
  postingDate: z.string().optional(), // LocalDate YYYY-MM-DD
  constraints: z
    .object({
      mustBalance: z.boolean().default(true),
      maxLines: z.number().int().positive().default(6),
    })
    .optional(),
  idempotencyKey: z.string().optional(),
});

export type GenerateJournalDraftInput = z.infer<typeof GenerateJournalDraftInputSchema>;

export const DraftLineProposalSchema = z.object({
  ledgerAccountId: z.string().optional(),
  ledgerAccountCode: z.string().optional(),
  ledgerAccountName: z.string().optional(),
  direction: LineDirectionSchema,
  amountCents: z.number().int().positive(),
  currency: z.string(),
  lineMemo: z.string().optional(),
  unresolved: z.boolean().default(false),
  unresolvedReason: z.string().optional(),
});

export type DraftLineProposal = z.infer<typeof DraftLineProposalSchema>;

export const GenerateJournalDraftOutputSchema = z.object({
  draftProposal: z.object({
    postingDate: z.string(), // LocalDate YYYY-MM-DD
    memo: z.string(),
    lines: z.array(DraftLineProposalSchema),
    missingFields: z.array(z.string()).optional(),
    isBalanced: z.boolean(),
    totalDebitsCents: z.number().int(),
    totalCreditsCents: z.number().int(),
  }),
  requiredFollowups: z.array(
    z.object({
      field: z.string(),
      question: z.string(),
      suggestions: z.array(z.string()).optional(),
    })
  ),
  confidence: ConfidenceLevelSchema,
  rationale: z.string(),
  provenance: ProvenanceSummarySchema,
  aiInteractionId: z.string(),
});

export type GenerateJournalDraftOutput = z.infer<typeof GenerateJournalDraftOutputSchema>;
