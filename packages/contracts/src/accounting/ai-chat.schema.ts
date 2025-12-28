import { z } from "zod";
import { ConfidenceLevelSchema, SuggestionTypeSchema } from "./enums";
import { ProvenanceSummarySchema } from "./ai-interaction.types";

// Chat message schema
export const ChatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
});

export type ChatMessage = z.infer<typeof ChatMessageSchema>;

// UI Context schema
export const UiContextSchema = z.object({
  currentRoute: z.string().optional(),
  selectedAccountId: z.string().optional(),
  selectedJournalEntryId: z.string().optional(),
  currentReport: z
    .object({
      type: z.enum(["trialBalance", "generalLedger", "profitLoss", "balanceSheet"]),
      fromDate: z.string().optional(),
      toDate: z.string().optional(),
      asOfDate: z.string().optional(),
      accountId: z.string().optional(),
    })
    .optional(),
  currentPeriod: z
    .object({
      periodId: z.string(),
      fromDate: z.string(),
      toDate: z.string(),
    })
    .optional(),
});

export type UiContext = z.infer<typeof UiContextSchema>;

// Data scope schema
export const DataScopeSchema = z.object({
  includeAccounts: z.boolean().default(true),
  includeRecentEntries: z.boolean().default(true),
  includeReportSummaries: z.boolean().default(false),
  includePeriods: z.boolean().default(false),
  recentEntriesLimit: z.number().int().positive().default(20),
  recentEntriesDays: z.number().int().positive().default(90),
});

export type DataScope = z.infer<typeof DataScopeSchema>;

// Structured suggestion schemas
export const CreateDraftProposalSuggestionSchema = z.object({
  type: z.literal("CreateDraftJournalEntryProposal"),
  draftProposal: z.object({
    postingDate: z.string(),
    memo: z.string(),
    lines: z.array(
      z.object({
        ledgerAccountId: z.string().optional(),
        ledgerAccountCode: z.string().optional(),
        direction: z.enum(["Debit", "Credit"]),
        amountCents: z.number().int().positive(),
        currency: z.string(),
        lineMemo: z.string().optional(),
      })
    ),
    missingFields: z.array(z.string()).optional(),
  }),
  confidence: ConfidenceLevelSchema,
  rationale: z.string(),
});

export type CreateDraftProposalSuggestion = z.infer<typeof CreateDraftProposalSuggestionSchema>;

export const AccountMappingSuggestionSchema = z.object({
  type: z.literal("AccountMappingSuggestion"),
  lineIndex: z.number().int().nonnegative().optional(),
  suggestions: z.array(
    z.object({
      ledgerAccountId: z.string(),
      ledgerAccountCode: z.string(),
      ledgerAccountName: z.string(),
      direction: z.enum(["Debit", "Credit"]),
      confidence: ConfidenceLevelSchema,
      rationale: z.string(),
    })
  ),
});

export type AccountMappingSuggestion = z.infer<typeof AccountMappingSuggestionSchema>;

export const ExplainReportBreakdownSuggestionSchema = z.object({
  type: z.literal("ExplainReportBreakdown"),
  narrative: z.string(),
  keyDrivers: z.array(
    z.object({
      description: z.string(),
      amountChangeCents: z.number().int().optional(),
      accountId: z.string().optional(),
    })
  ),
});

export type ExplainReportBreakdownSuggestion = z.infer<
  typeof ExplainReportBreakdownSuggestionSchema
>;

export const ShowAnomaliesSuggestionSchema = z.object({
  type: z.literal("ShowAnomalies"),
  anomalies: z.array(
    z.object({
      severity: z.enum(["info", "warn", "high"]),
      description: z.string(),
      journalEntryId: z.string().optional(),
      accountId: z.string().optional(),
    })
  ),
});

export type ShowAnomaliesSuggestion = z.infer<typeof ShowAnomaliesSuggestionSchema>;

export const StructuredSuggestionSchema = z.discriminatedUnion("type", [
  CreateDraftProposalSuggestionSchema,
  AccountMappingSuggestionSchema,
  ExplainReportBreakdownSuggestionSchema,
  ShowAnomaliesSuggestionSchema,
]);

export type StructuredSuggestion = z.infer<typeof StructuredSuggestionSchema>;

// Input schema
export const AccountingCopilotChatInputSchema = z.object({
  conversationId: z.string().optional(),
  messages: z.array(ChatMessageSchema).min(1),
  uiContext: UiContextSchema.optional(),
  dataScope: DataScopeSchema.optional(),
  idempotencyKey: z.string().optional(),
});

export type AccountingCopilotChatInput = z.infer<typeof AccountingCopilotChatInputSchema>;

// Output schema
export const AccountingCopilotChatOutputSchema = z.object({
  conversationId: z.string(),
  assistantMessage: z.string(),
  suggestions: z.array(StructuredSuggestionSchema).optional(),
  provenance: ProvenanceSummarySchema,
  confidence: ConfidenceLevelSchema,
  aiInteractionId: z.string(),
});

export type AccountingCopilotChatOutput = z.infer<typeof AccountingCopilotChatOutputSchema>;
