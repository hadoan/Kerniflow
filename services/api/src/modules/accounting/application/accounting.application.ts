// Accounting Application Service Facade
import { SetupAccountingUseCase } from "./use-cases/setup-accounting.usecase";
import {
  GetSetupStatusUseCase,
  CreateLedgerAccountUseCase,
  UpdateLedgerAccountUseCase,
  ListLedgerAccountsUseCase,
  CreateJournalEntryUseCase,
  UpdateJournalEntryUseCase,
  PostJournalEntryUseCase,
  ReverseJournalEntryUseCase,
  ListJournalEntriesUseCase,
  ClosePeriodUseCase,
  ReopenPeriodUseCase,
  UpdateAccountingSettingsUseCase,
} from "./use-cases/accounting.usecases";
import {
  GetTrialBalanceUseCase,
  GetGeneralLedgerUseCase,
  GetProfitLossUseCase,
  GetBalanceSheetUseCase,
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
