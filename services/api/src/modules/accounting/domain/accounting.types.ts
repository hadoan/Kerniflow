// Domain types for Accounting Core

import type {
  AccountType,
  EntryStatus,
  LineDirection,
  PeriodStatus,
  SourceType,
} from "@kerniflow/contracts";

// Value Objects
export type Money = {
  amountCents: number;
  currency: string;
};

export type DateRange = {
  startDate: string; // LocalDate YYYY-MM-DD
  endDate: string; // LocalDate YYYY-MM-DD
};

// LedgerAccount
export type LedgerAccountProps = {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  type: AccountType;
  isActive: boolean;
  description?: string;
  systemAccountKey?: string;
  createdAt: Date;
  updatedAt: Date;
};

// JournalLine
export type JournalLineProps = {
  id: string;
  ledgerAccountId: string;
  direction: LineDirection;
  amountCents: number;
  currency: string;
  lineMemo?: string;
  reference?: string;
  tags?: string[];
};

// JournalEntry
export type JournalEntryProps = {
  id: string;
  tenantId: string;
  entryNumber?: string;
  status: EntryStatus;
  postingDate: string; // LocalDate YYYY-MM-DD
  memo: string;
  sourceType?: SourceType;
  sourceId?: string;
  sourceRef?: string;
  lines: JournalLineProps[];
  reversesEntryId?: string;
  reversedByEntryId?: string;
  createdBy: string;
  createdAt: Date;
  postedBy?: string;
  postedAt?: Date;
  updatedAt: Date;
};

// AccountingSettings
export type AccountingSettingsProps = {
  id: string;
  tenantId: string;
  baseCurrency: string;
  fiscalYearStartMonthDay: string;
  periodLockingEnabled: boolean;
  entryNumberPrefix: string;
  nextEntryNumber: number;
  createdAt: Date;
  updatedAt: Date;
};

// AccountingPeriod
export type AccountingPeriodProps = {
  id: string;
  tenantId: string;
  fiscalYearId: string;
  name: string;
  startDate: string; // LocalDate YYYY-MM-DD
  endDate: string; // LocalDate YYYY-MM-DD
  status: PeriodStatus;
  closedAt?: Date;
  closedBy?: string;
  createdAt: Date;
  updatedAt: Date;
};

// Chart of Accounts Template
export type CoaTemplate = "minimal" | "freelancer" | "smallBusiness" | "standard";

export type TemplateAccount = {
  code: string;
  name: string;
  type: AccountType;
  systemAccountKey?: string;
  description?: string;
};
