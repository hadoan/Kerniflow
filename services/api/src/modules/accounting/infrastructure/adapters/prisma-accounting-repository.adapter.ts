import { Injectable } from "@nestjs/common";
import { PrismaService } from "@corely/data";
import type {
  AccountingSettingsRepoPort,
  LedgerAccountRepoPort,
  JournalEntryRepoPort,
  AccountingPeriodRepoPort,
} from "../../application/ports/accounting-repository.port";
import { AccountingSettingsAggregate } from "../../domain/accounting-settings.aggregate";
import { LedgerAccountAggregate } from "../../domain/ledger-account.aggregate";
import { JournalEntryAggregate } from "../../domain/journal-entry.aggregate";
import { AccountingPeriodAggregate } from "../../domain/accounting-period.aggregate";
import {
  accountingSettingsFromPrisma,
  accountingSettingsToPrisma,
  ledgerAccountFromPrisma,
  ledgerAccountToPrisma,
  journalEntryFromPrisma,
  journalEntryToPrisma,
  accountingPeriodFromPrisma,
  accountingPeriodToPrisma,
} from "./mappers";
import type { AccountType, EntryStatus } from "@corely/contracts";

@Injectable()
export class PrismaAccountingSettingsRepository implements AccountingSettingsRepoPort {
  constructor(private readonly prisma: PrismaService) {}

  async findByTenant(tenantId: string): Promise<AccountingSettingsAggregate | null> {
    const settings = await this.prisma.accountingSettings.findUnique({
      where: { tenantId },
    });
    return settings ? accountingSettingsFromPrisma(settings) : null;
  }

  async save(settings: AccountingSettingsAggregate): Promise<void> {
    const data = accountingSettingsToPrisma(settings);
    await this.prisma.accountingSettings.upsert({
      where: { tenantId: settings.tenantId },
      create: data,
      update: data,
    });
  }
}

@Injectable()
export class PrismaLedgerAccountRepository implements LedgerAccountRepoPort {
  constructor(private readonly prisma: PrismaService) {}

  async findById(tenantId: string, accountId: string): Promise<LedgerAccountAggregate | null> {
    const account = await this.prisma.ledgerAccount.findFirst({
      where: { id: accountId, tenantId },
    });
    return account ? ledgerAccountFromPrisma(account) : null;
  }

  async findByCode(tenantId: string, code: string): Promise<LedgerAccountAggregate | null> {
    const account = await this.prisma.ledgerAccount.findUnique({
      where: { tenantId_code: { tenantId, code } },
    });
    return account ? ledgerAccountFromPrisma(account) : null;
  }

  async list(
    tenantId: string,
    filters: {
      type?: AccountType;
      isActive?: boolean;
      search?: string;
      limit?: number;
      cursor?: string;
    }
  ): Promise<{ accounts: LedgerAccountAggregate[]; nextCursor: string | null; total: number }> {
    const where: any = { tenantId };

    if (filters.type) {
      where.type = filters.type;
    }
    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }
    if (filters.search) {
      where.OR = [
        { code: { contains: filters.search, mode: "insensitive" } },
        { name: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    const limit = filters.limit || 100;
    const cursor = filters.cursor ? { id: filters.cursor } : undefined;

    const [accounts, total] = await Promise.all([
      this.prisma.ledgerAccount.findMany({
        where,
        take: limit + 1,
        cursor,
        skip: cursor ? 1 : 0,
        orderBy: { code: "asc" },
      }),
      this.prisma.ledgerAccount.count({ where }),
    ]);

    const hasMore = accounts.length > limit;
    const items = hasMore ? accounts.slice(0, limit) : accounts;
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    return {
      accounts: items.map(ledgerAccountFromPrisma),
      nextCursor,
      total,
    };
  }

  async save(account: LedgerAccountAggregate): Promise<void> {
    const data = ledgerAccountToPrisma(account);
    await this.prisma.ledgerAccount.upsert({
      where: { id: account.id },
      create: data,
      update: data,
    });
  }

  async saveMany(accounts: LedgerAccountAggregate[]): Promise<void> {
    await this.prisma.$transaction(
      accounts.map((account) => {
        const data = ledgerAccountToPrisma(account);
        return this.prisma.ledgerAccount.upsert({
          where: { id: account.id },
          create: data,
          update: data,
        });
      })
    );
  }
}

@Injectable()
export class PrismaJournalEntryRepository implements JournalEntryRepoPort {
  constructor(private readonly prisma: PrismaService) {}

  async findById(tenantId: string, entryId: string): Promise<JournalEntryAggregate | null> {
    const entry = await this.prisma.journalEntry.findFirst({
      where: { id: entryId, tenantId },
      include: { lines: true },
    });
    return entry ? journalEntryFromPrisma(entry) : null;
  }

  async list(
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
  ): Promise<{ entries: JournalEntryAggregate[]; nextCursor: string | null; total: number }> {
    const where: any = { tenantId };

    if (filters.status) {
      where.status = filters.status;
    }
    if (filters.fromDate) {
      where.postingDate = { ...where.postingDate, gte: new Date(filters.fromDate) };
    }
    if (filters.toDate) {
      where.postingDate = { ...where.postingDate, lte: new Date(filters.toDate) };
    }
    if (filters.accountId) {
      where.lines = {
        some: {
          ledgerAccountId: filters.accountId,
        },
      };
    }
    if (filters.search) {
      where.OR = [
        { memo: { contains: filters.search, mode: "insensitive" } },
        { entryNumber: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    const limit = filters.limit || 50;
    const cursor = filters.cursor ? { id: filters.cursor } : undefined;

    const [entries, total] = await Promise.all([
      this.prisma.journalEntry.findMany({
        where,
        include: { lines: true },
        take: limit + 1,
        cursor,
        skip: cursor ? 1 : 0,
        orderBy: { postingDate: "desc" },
      }),
      this.prisma.journalEntry.count({ where }),
    ]);

    const hasMore = entries.length > limit;
    const items = hasMore ? entries.slice(0, limit) : entries;
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    return {
      entries: items.map(journalEntryFromPrisma),
      nextCursor,
      total,
    };
  }

  async save(entry: JournalEntryAggregate): Promise<void> {
    const { entry: entryData, lines: linesData } = journalEntryToPrisma(entry);

    await this.prisma.$transaction(async (tx) => {
      // Upsert entry
      await tx.journalEntry.upsert({
        where: { id: entry.id },
        create: {
          ...entryData,
          lines: { create: linesData.map((l) => ({ ...l, tenantId: entry.tenantId })) },
        },
        update: entryData,
      });

      // Delete existing lines if updating
      await tx.journalLine.deleteMany({
        where: { journalEntryId: entry.id },
      });

      // Create new lines
      await tx.journalLine.createMany({
        data: linesData.map((l) => ({ ...l, tenantId: entry.tenantId })),
      });
    });
  }

  async delete(tenantId: string, entryId: string): Promise<void> {
    await this.prisma.journalEntry.deleteMany({
      where: { id: entryId, tenantId },
    });
  }
}

@Injectable()
export class PrismaAccountingPeriodRepository implements AccountingPeriodRepoPort {
  constructor(private readonly prisma: PrismaService) {}

  async findById(tenantId: string, periodId: string): Promise<AccountingPeriodAggregate | null> {
    const period = await this.prisma.accountingPeriod.findFirst({
      where: { id: periodId, tenantId },
    });
    return period ? accountingPeriodFromPrisma(period) : null;
  }

  async list(tenantId: string): Promise<AccountingPeriodAggregate[]> {
    const periods = await this.prisma.accountingPeriod.findMany({
      where: { tenantId },
      orderBy: { startDate: "asc" },
    });
    return periods.map(accountingPeriodFromPrisma);
  }

  async findPeriodContainingDate(
    tenantId: string,
    date: string
  ): Promise<AccountingPeriodAggregate | null> {
    const dateObj = new Date(date);
    const period = await this.prisma.accountingPeriod.findFirst({
      where: {
        tenantId,
        startDate: { lte: dateObj },
        endDate: { gte: dateObj },
      },
    });
    return period ? accountingPeriodFromPrisma(period) : null;
  }

  async saveMany(periods: AccountingPeriodAggregate[]): Promise<void> {
    await this.prisma.$transaction(
      periods.map((period) => {
        const data = accountingPeriodToPrisma(period);
        return this.prisma.accountingPeriod.upsert({
          where: { id: period.id },
          create: data,
          update: data,
        });
      })
    );
  }

  async save(period: AccountingPeriodAggregate): Promise<void> {
    const data = accountingPeriodToPrisma(period);
    await this.prisma.accountingPeriod.upsert({
      where: { id: period.id },
      create: data,
      update: data,
    });
  }
}
