// Accounting Application Service Facade
import { type SetupAccountingUseCase } from "./use-cases/setup-accounting.usecase";
import {
  type GetSetupStatusUseCase,
  type CreateLedgerAccountUseCase,
  type UpdateLedgerAccountUseCase,
  type ListLedgerAccountsUseCase,
  type CreateJournalEntryUseCase,
  type UpdateJournalEntryUseCase,
  type PostJournalEntryUseCase,
  type ReverseJournalEntryUseCase,
  type ListJournalEntriesUseCase,
  type ClosePeriodUseCase,
  type ReopenPeriodUseCase,
  type UpdateAccountingSettingsUseCase,
} from "./use-cases/accounting.usecases";
import {
  type GetTrialBalanceUseCase,
  type GetGeneralLedgerUseCase,
  type GetProfitLossUseCase,
  type GetBalanceSheetUseCase,
} from "./use-cases/reports.usecases";

export class AccountingApplication {
  constructor(
    // Setup
    public readonly getSetupStatus: GetSetupStatusUseCase,
    public readonly setupAccounting: SetupAccountingUseCase,

    // Ledger Accounts
    public readonly createLedgerAccount: CreateLedgerAccountUseCase,
    public readonly updateLedgerAccount: UpdateLedgerAccountUseCase,
    public readonly listLedgerAccounts: ListLedgerAccountsUseCase,

    // Journal Entries
    public readonly createJournalEntry: CreateJournalEntryUseCase,
    public readonly updateJournalEntry: UpdateJournalEntryUseCase,
    public readonly postJournalEntry: PostJournalEntryUseCase,
    public readonly reverseJournalEntry: ReverseJournalEntryUseCase,
    public readonly listJournalEntries: ListJournalEntriesUseCase,

    // Reports
    public readonly getTrialBalance: GetTrialBalanceUseCase,
    public readonly getGeneralLedger: GetGeneralLedgerUseCase,
    public readonly getProfitLoss: GetProfitLossUseCase,
    public readonly getBalanceSheet: GetBalanceSheetUseCase,

    // Periods & Settings
    public readonly closePeriod: ClosePeriodUseCase,
    public readonly reopenPeriod: ReopenPeriodUseCase,
    public readonly updateSettings: UpdateAccountingSettingsUseCase
  ) {}
}
