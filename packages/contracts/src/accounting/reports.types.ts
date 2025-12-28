import { z } from "zod";
import { AccountTypeSchema } from "./enums";

// Trial Balance
export const TrialBalanceLineDtoSchema = z.object({
  ledgerAccountId: z.string(),
  ledgerAccountCode: z.string(),
  ledgerAccountName: z.string(),
  ledgerAccountType: AccountTypeSchema,
  debitsCents: z.number().int(),
  creditsCents: z.number().int(),
  balanceCents: z.number().int(),
});

export type TrialBalanceLineDto = z.infer<typeof TrialBalanceLineDtoSchema>;

export const TrialBalanceDtoSchema = z.object({
  fromDate: z.string(), // LocalDate YYYY-MM-DD
  toDate: z.string(), // LocalDate YYYY-MM-DD
  currency: z.string(),
  lines: z.array(TrialBalanceLineDtoSchema),
  totalDebitsCents: z.number().int(),
  totalCreditsCents: z.number().int(),
});

export type TrialBalanceDto = z.infer<typeof TrialBalanceDtoSchema>;

// General Ledger
export const GeneralLedgerEntryDtoSchema = z.object({
  id: z.string(),
  journalEntryId: z.string(),
  journalEntryNumber: z.string().nullable(),
  postingDate: z.string(), // LocalDate YYYY-MM-DD
  memo: z.string(),
  lineMemo: z.string().nullable(),
  debitCents: z.number().int(),
  creditCents: z.number().int(),
  balanceCents: z.number().int(),
});

export type GeneralLedgerEntryDto = z.infer<typeof GeneralLedgerEntryDtoSchema>;

export const GeneralLedgerDtoSchema = z.object({
  ledgerAccountId: z.string(),
  ledgerAccountCode: z.string(),
  ledgerAccountName: z.string(),
  ledgerAccountType: AccountTypeSchema,
  fromDate: z.string(), // LocalDate YYYY-MM-DD
  toDate: z.string(), // LocalDate YYYY-MM-DD
  currency: z.string(),
  openingBalanceCents: z.number().int(),
  entries: z.array(GeneralLedgerEntryDtoSchema),
  closingBalanceCents: z.number().int(),
  totalDebitsCents: z.number().int(),
  totalCreditsCents: z.number().int(),
});

export type GeneralLedgerDto = z.infer<typeof GeneralLedgerDtoSchema>;

// Profit & Loss
export const ProfitLossSectionDtoSchema = z.object({
  ledgerAccountId: z.string(),
  ledgerAccountCode: z.string(),
  ledgerAccountName: z.string(),
  amountCents: z.number().int(),
});

export type ProfitLossSectionDto = z.infer<typeof ProfitLossSectionDtoSchema>;

export const ProfitLossDtoSchema = z.object({
  fromDate: z.string(), // LocalDate YYYY-MM-DD
  toDate: z.string(), // LocalDate YYYY-MM-DD
  currency: z.string(),
  incomeAccounts: z.array(ProfitLossSectionDtoSchema),
  expenseAccounts: z.array(ProfitLossSectionDtoSchema),
  totalIncomeCents: z.number().int(),
  totalExpensesCents: z.number().int(),
  netProfitCents: z.number().int(),
});

export type ProfitLossDto = z.infer<typeof ProfitLossDtoSchema>;

// Balance Sheet
export const BalanceSheetSectionDtoSchema = z.object({
  ledgerAccountId: z.string(),
  ledgerAccountCode: z.string(),
  ledgerAccountName: z.string(),
  balanceCents: z.number().int(),
});

export type BalanceSheetSectionDto = z.infer<typeof BalanceSheetSectionDtoSchema>;

export const BalanceSheetDtoSchema = z.object({
  asOfDate: z.string(), // LocalDate YYYY-MM-DD
  currency: z.string(),
  assetAccounts: z.array(BalanceSheetSectionDtoSchema),
  liabilityAccounts: z.array(BalanceSheetSectionDtoSchema),
  equityAccounts: z.array(BalanceSheetSectionDtoSchema),
  totalAssetsCents: z.number().int(),
  totalLiabilitiesCents: z.number().int(),
  totalEquityCents: z.number().int(),
});

export type BalanceSheetDto = z.infer<typeof BalanceSheetDtoSchema>;
