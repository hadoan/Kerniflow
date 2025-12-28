// Accounting Core Module Exports
export { AccountingModule } from "./accounting.module";
export { AccountingApplication } from "./application/accounting.application";

// Aggregates (for testing/external use)
export { LedgerAccountAggregate } from "./domain/ledger-account.aggregate";
export { JournalEntryAggregate } from "./domain/journal-entry.aggregate";
export { AccountingSettingsAggregate } from "./domain/accounting-settings.aggregate";
export { AccountingPeriodAggregate } from "./domain/accounting-period.aggregate";

// Types
export type * from "./domain/accounting.types";
