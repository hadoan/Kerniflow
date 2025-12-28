import type { LedgerAccountAggregate } from "../../domain/ledger-account.aggregate";
import type { JournalEntryAggregate } from "../../domain/journal-entry.aggregate";
import type { AccountingSettingsAggregate } from "../../domain/accounting-settings.aggregate";
import type { AccountingPeriodAggregate } from "../../domain/accounting-period.aggregate";
import type { AccountType, EntryStatus } from "@kerniflow/contracts";

// Repository ports for Accounting aggregates

export interface AccountingSettingsRepoPort {
  findByTenant(tenantId: string): Promise<AccountingSettingsAggregate | null>;
  save(settings: AccountingSettingsAggregate): Promise<void>;
}

export interface LedgerAccountRepoPort {
  findById(tenantId: string, accountId: string): Promise<LedgerAccountAggregate | null>;
  findByCode(tenantId: string, code: string): Promise<LedgerAccountAggregate | null>;
  list(
    tenantId: string,
    filters: {
      type?: AccountType;
      isActive?: boolean;
      search?: string;
      limit?: number;
      cursor?: string;
    }
  ): Promise<{ accounts: LedgerAccountAggregate[]; nextCursor: string | null; total: number }>;
  save(account: LedgerAccountAggregate): Promise<void>;
  saveMany(accounts: LedgerAccountAggregate[]): Promise<void>;
}

export interface JournalEntryRepoPort {
  findById(tenantId: string, entryId: string): Promise<JournalEntryAggregate | null>;
  list(
    tenantId: string,
    filters: {
      status?: EntryStatus;
      fromDate?: string;
      toDate?: string;
      accountId?: string;
      search?: string;
      limit?: number;
      cursor?: string;
    }
  ): Promise<{ entries: JournalEntryAggregate[]; nextCursor: string | null; total: number }>;
  save(entry: JournalEntryAggregate): Promise<void>;
  delete(tenantId: string, entryId: string): Promise<void>;
}

export interface AccountingPeriodRepoPort {
  findById(tenantId: string, periodId: string): Promise<AccountingPeriodAggregate | null>;
  list(tenantId: string): Promise<AccountingPeriodAggregate[]>;
  findPeriodContainingDate(
    tenantId: string,
    date: string
  ): Promise<AccountingPeriodAggregate | null>;
  saveMany(periods: AccountingPeriodAggregate[]): Promise<void>;
  save(period: AccountingPeriodAggregate): Promise<void>;
}

export const ACCOUNTING_SETTINGS_REPO_PORT = Symbol("ACCOUNTING_SETTINGS_REPO_PORT");
export const LEDGER_ACCOUNT_REPO_PORT = Symbol("LEDGER_ACCOUNT_REPO_PORT");
export const JOURNAL_ENTRY_REPO_PORT = Symbol("JOURNAL_ENTRY_REPO_PORT");
export const ACCOUNTING_PERIOD_REPO_PORT = Symbol("ACCOUNTING_PERIOD_REPO_PORT");
