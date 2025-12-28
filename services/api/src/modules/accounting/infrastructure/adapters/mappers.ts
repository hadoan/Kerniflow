// Mappers between Prisma models and Domain aggregates

import type {
  AccountingSettings,
  AccountingPeriod,
  LedgerAccount,
  JournalEntry,
  JournalLine,
} from "@prisma/client";
import { LedgerAccountAggregate } from "../../domain/ledger-account.aggregate";
import { JournalEntryAggregate } from "../../domain/journal-entry.aggregate";
import { AccountingSettingsAggregate } from "../../domain/accounting-settings.aggregate";
import { AccountingPeriodAggregate } from "../../domain/accounting-period.aggregate";
import type {
  LedgerAccountProps,
  JournalEntryProps,
  JournalLineProps,
  AccountingSettingsProps,
  AccountingPeriodProps,
} from "../../domain/accounting.types";
import type {
  AccountType,
  EntryStatus,
  LineDirection,
  PeriodStatus,
  SourceType,
} from "@kerniflow/contracts";

// Helper to format dates
function toLocalDateString(date: Date): string {
  return date.toISOString().split("T")[0];
}

function fromLocalDateString(dateStr: string): Date {
  return new Date(dateStr + "T00:00:00.000Z");
}

// AccountingSettings mappers
export function accountingSettingsFromPrisma(
  prisma: AccountingSettings
): AccountingSettingsAggregate {
  const props: AccountingSettingsProps = {
    id: prisma.id,
    tenantId: prisma.tenantId,
    baseCurrency: prisma.baseCurrency,
    fiscalYearStartMonthDay: prisma.fiscalYearStartMonthDay,
    periodLockingEnabled: prisma.periodLockingEnabled,
    entryNumberPrefix: prisma.entryNumberPrefix,
    nextEntryNumber: prisma.nextEntryNumber,
    createdAt: prisma.createdAt,
    updatedAt: prisma.updatedAt,
  };
  return AccountingSettingsAggregate.fromProps(props);
}

export function accountingSettingsToPrisma(
  aggregate: AccountingSettingsAggregate
): Omit<AccountingSettings, "createdAt" | "updatedAt"> {
  const props = aggregate.toProps();
  return {
    id: props.id,
    tenantId: props.tenantId,
    baseCurrency: props.baseCurrency,
    fiscalYearStartMonthDay: props.fiscalYearStartMonthDay,
    periodLockingEnabled: props.periodLockingEnabled,
    entryNumberPrefix: props.entryNumberPrefix,
    nextEntryNumber: props.nextEntryNumber,
  };
}

// AccountingPeriod mappers
export function accountingPeriodFromPrisma(prisma: AccountingPeriod): AccountingPeriodAggregate {
  const props: AccountingPeriodProps = {
    id: prisma.id,
    tenantId: prisma.tenantId,
    fiscalYearId: prisma.fiscalYearId,
    name: prisma.name,
    startDate: toLocalDateString(prisma.startDate),
    endDate: toLocalDateString(prisma.endDate),
    status: prisma.status as PeriodStatus,
    closedAt: prisma.closedAt ?? undefined,
    closedBy: prisma.closedBy ?? undefined,
    createdAt: prisma.createdAt,
    updatedAt: prisma.updatedAt,
  };
  return AccountingPeriodAggregate.fromProps(props);
}

export function accountingPeriodToPrisma(aggregate: AccountingPeriodAggregate): Omit<
  AccountingPeriod,
  "createdAt" | "updatedAt" | "startDate" | "endDate"
> & {
  startDate: Date;
  endDate: Date;
} {
  const props = aggregate.toProps();
  return {
    id: props.id,
    tenantId: props.tenantId,
    fiscalYearId: props.fiscalYearId,
    name: props.name,
    startDate: fromLocalDateString(props.startDate),
    endDate: fromLocalDateString(props.endDate),
    status: props.status as PeriodStatus,
    closedAt: props.closedAt ?? null,
    closedBy: props.closedBy ?? null,
  };
}

// LedgerAccount mappers
export function ledgerAccountFromPrisma(prisma: LedgerAccount): LedgerAccountAggregate {
  const props: LedgerAccountProps = {
    id: prisma.id,
    tenantId: prisma.tenantId,
    code: prisma.code,
    name: prisma.name,
    type: prisma.type as AccountType,
    isActive: prisma.isActive,
    description: prisma.description ?? undefined,
    systemAccountKey: prisma.systemAccountKey ?? undefined,
    createdAt: prisma.createdAt,
    updatedAt: prisma.updatedAt,
  };
  return LedgerAccountAggregate.fromProps(props);
}

export function ledgerAccountToPrisma(
  aggregate: LedgerAccountAggregate
): Omit<LedgerAccount, "createdAt" | "updatedAt"> {
  const props = aggregate.toProps();
  return {
    id: props.id,
    tenantId: props.tenantId,
    code: props.code,
    name: props.name,
    type: props.type as AccountType,
    isActive: props.isActive,
    description: props.description ?? null,
    systemAccountKey: props.systemAccountKey ?? null,
  };
}

// JournalEntry mappers
type JournalEntryWithLines = JournalEntry & { lines: JournalLine[] };

export function journalEntryFromPrisma(prisma: JournalEntryWithLines): JournalEntryAggregate {
  const lines: JournalLineProps[] = prisma.lines.map((line) => ({
    id: line.id,
    ledgerAccountId: line.ledgerAccountId,
    direction: line.direction as LineDirection,
    amountCents: line.amountCents,
    currency: line.currency,
    lineMemo: line.lineMemo ?? undefined,
    reference: line.reference ?? undefined,
    tags: line.tags ? JSON.parse(line.tags) : undefined,
  }));

  const props: JournalEntryProps = {
    id: prisma.id,
    tenantId: prisma.tenantId,
    entryNumber: prisma.entryNumber ?? undefined,
    status: prisma.status as EntryStatus,
    postingDate: toLocalDateString(prisma.postingDate),
    memo: prisma.memo,
    sourceType: (prisma.sourceType as SourceType) ?? undefined,
    sourceId: prisma.sourceId ?? undefined,
    sourceRef: prisma.sourceRef ?? undefined,
    lines,
    reversesEntryId: prisma.reversesEntryId ?? undefined,
    reversedByEntryId: prisma.reversedByEntryId ?? undefined,
    createdBy: prisma.createdBy,
    createdAt: prisma.createdAt,
    postedBy: prisma.postedBy ?? undefined,
    postedAt: prisma.postedAt ?? undefined,
    updatedAt: prisma.updatedAt,
  };
  return JournalEntryAggregate.fromProps(props);
}

export function journalEntryToPrisma(aggregate: JournalEntryAggregate): {
  entry: Omit<JournalEntry, "createdAt" | "updatedAt" | "postingDate"> & { postingDate: Date };
  lines: Omit<JournalLine, "tenantId">[];
} {
  const props = aggregate.toProps();
  const entry = {
    id: props.id,
    tenantId: props.tenantId,
    entryNumber: props.entryNumber ?? null,
    status: props.status as EntryStatus,
    postingDate: fromLocalDateString(props.postingDate),
    memo: props.memo,
    sourceType: (props.sourceType as SourceType) ?? null,
    sourceId: props.sourceId ?? null,
    sourceRef: props.sourceRef ?? null,
    reversesEntryId: props.reversesEntryId ?? null,
    reversedByEntryId: props.reversedByEntryId ?? null,
    createdBy: props.createdBy,
    postedBy: props.postedBy ?? null,
    postedAt: props.postedAt ?? null,
  };

  const lines = props.lines.map((line) => ({
    id: line.id,
    journalEntryId: props.id,
    ledgerAccountId: line.ledgerAccountId,
    direction: line.direction as LineDirection,
    amountCents: line.amountCents,
    currency: line.currency,
    lineMemo: line.lineMemo ?? null,
    reference: line.reference ?? null,
    tags: line.tags ? JSON.stringify(line.tags) : null,
  }));

  return { entry, lines };
}
