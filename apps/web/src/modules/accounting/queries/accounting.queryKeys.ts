// Query key factory for accounting module
// Follows TanStack Query best practices: https://tkdodo.eu/blog/effective-react-query-keys

import type {
  ListLedgerAccountsInput,
  ListJournalEntriesInput,
  GetTrialBalanceInput,
  GetGeneralLedgerInput,
  GetProfitLossInput,
  GetBalanceSheetInput,
} from "@corely/contracts";

export const accountingQueryKeys = {
  // Root key
  all: ["accounting"] as const,

  // Setup
  setupStatus: () => [...accountingQueryKeys.all, "setupStatus"] as const,

  // Accounts
  accounts: {
    all: () => [...accountingQueryKeys.all, "accounts"] as const,
    lists: () => [...accountingQueryKeys.accounts.all(), "list"] as const,
    list: (query?: ListLedgerAccountsInput) =>
      [...accountingQueryKeys.accounts.lists(), query] as const,
    details: () => [...accountingQueryKeys.accounts.all(), "detail"] as const,
    detail: (accountId: string) => [...accountingQueryKeys.accounts.details(), accountId] as const,
  },

  // Journal Entries
  journalEntries: {
    all: () => [...accountingQueryKeys.all, "journalEntries"] as const,
    lists: () => [...accountingQueryKeys.journalEntries.all(), "list"] as const,
    list: (query?: ListJournalEntriesInput) =>
      [...accountingQueryKeys.journalEntries.lists(), query] as const,
    details: () => [...accountingQueryKeys.journalEntries.all(), "detail"] as const,
    detail: (entryId: string) =>
      [...accountingQueryKeys.journalEntries.details(), entryId] as const,
  },

  // Settings & Periods
  settings: () => [...accountingQueryKeys.all, "settings"] as const,

  periods: {
    all: () => [...accountingQueryKeys.all, "periods"] as const,
    list: () => [...accountingQueryKeys.periods.all(), "list"] as const,
  },

  // Reports
  reports: {
    all: () => [...accountingQueryKeys.all, "reports"] as const,
    trialBalance: (params: GetTrialBalanceInput) =>
      [...accountingQueryKeys.reports.all(), "trialBalance", params] as const,
    generalLedger: (params: GetGeneralLedgerInput) =>
      [...accountingQueryKeys.reports.all(), "generalLedger", params] as const,
    profitLoss: (params: GetProfitLossInput) =>
      [...accountingQueryKeys.reports.all(), "profitLoss", params] as const,
    balanceSheet: (params: GetBalanceSheetInput) =>
      [...accountingQueryKeys.reports.all(), "balanceSheet", params] as const,
  },
} as const;
