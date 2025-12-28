import { z } from "zod";

// Account Types
export const AccountTypeSchema = z.enum(["Asset", "Liability", "Equity", "Income", "Expense"]);
export type AccountType = z.infer<typeof AccountTypeSchema>;

// Journal Entry Status
export const EntryStatusSchema = z.enum(["Draft", "Posted", "Reversed"]);
export type EntryStatus = z.infer<typeof EntryStatusSchema>;

// Line Direction
export const LineDirectionSchema = z.enum(["Debit", "Credit"]);
export type LineDirection = z.infer<typeof LineDirectionSchema>;

// Period Status
export const PeriodStatusSchema = z.enum(["Open", "Closed"]);
export type PeriodStatus = z.infer<typeof PeriodStatusSchema>;

// Source Type
export const SourceTypeSchema = z.enum([
  "Manual",
  "Invoice",
  "Payment",
  "Expense",
  "Migration",
  "Adjustment",
]);
export type SourceType = z.infer<typeof SourceTypeSchema>;

// AI Context Type
export const AiContextTypeSchema = z.enum([
  "AccountingCopilotChat",
  "SuggestAccounts",
  "GenerateJournalDraft",
  "ExplainJournalEntry",
  "ExplainReport",
  "AnomalyScan",
  "CloseChecklist",
]);
export type AiContextType = z.infer<typeof AiContextTypeSchema>;

// AI Suggestion Type
export const SuggestionTypeSchema = z.enum([
  "AccountSuggestion",
  "MemoSuggestion",
  "SplitSuggestion",
  "VarianceInsight",
  "AnomalyAlert",
  "ChecklistItem",
  "CreateDraftJournalEntryProposal",
  "AccountMappingSuggestion",
  "ExplainReportBreakdown",
  "ShowAnomalies",
]);
export type SuggestionType = z.infer<typeof SuggestionTypeSchema>;

// AI Confidence Level
export const ConfidenceLevelSchema = z.enum(["High", "Medium", "Low"]);
export type ConfidenceLevel = z.infer<typeof ConfidenceLevelSchema>;

// Report Type
export const ReportTypeSchema = z.enum([
  "TrialBalance",
  "GeneralLedger",
  "ProfitLoss",
  "BalanceSheet",
]);
export type ReportType = z.infer<typeof ReportTypeSchema>;
