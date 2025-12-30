import { Injectable } from "@nestjs/common";
import { PrismaService } from "@corely/data";
import { EntryStatus } from "@prisma/client";
import type {
  AccountingReportQueryPort,
  AccountActivityQuery,
  AccountActivityTotals,
  LedgerLineRow,
} from "../../application/ports/accounting-report-query.port";

@Injectable()
export class PrismaAccountingReportQueryAdapter implements AccountingReportQueryPort {
  constructor(private readonly prisma: PrismaService) {}

  async getAccountActivityTotals(query: AccountActivityQuery): Promise<AccountActivityTotals> {
    const postingDate = buildPostingDateFilter(query);

    const baseWhere = {
      tenantId: query.tenantId,
      ledgerAccountId: query.accountId,
      journalEntry: {
        is: {
          status: EntryStatus.Posted,
          ...(postingDate ? { postingDate } : {}),
        },
      },
    };

    const debits = await this.prisma.journalLine.aggregate({
      where: {
        ...baseWhere,
        direction: "Debit",
      },
      _sum: { amountCents: true },
    });

    const credits = await this.prisma.journalLine.aggregate({
      where: {
        ...baseWhere,
        direction: "Credit",
      },
      _sum: { amountCents: true },
    });

    return {
      debitsCents: debits._sum.amountCents || 0,
      creditsCents: credits._sum.amountCents || 0,
    };
  }

  async listLedgerLines(query: {
    tenantId: string;
    accountId: string;
    fromDate: string;
    toDate: string;
  }): Promise<LedgerLineRow[]> {
    return this.prisma.journalLine.findMany({
      where: {
        tenantId: query.tenantId,
        ledgerAccountId: query.accountId,
        journalEntry: {
          is: {
            status: EntryStatus.Posted,
            postingDate: {
              gte: new Date(query.fromDate),
              lte: new Date(query.toDate),
            },
          },
        },
      },
      include: {
        journalEntry: true,
      },
      orderBy: {
        journalEntry: {
          postingDate: "asc",
        },
      },
    });
  }
}

function buildPostingDateFilter(query: AccountActivityQuery) {
  if (!query.fromDate && !query.toDate && !query.toDateExclusive) {
    return undefined;
  }

  const filter: { gte?: Date; lte?: Date; lt?: Date } = {};
  if (query.fromDate) {
    filter.gte = new Date(query.fromDate);
  }
  if (query.toDate) {
    filter.lte = new Date(query.toDate);
  }
  if (query.toDateExclusive) {
    filter.lt = new Date(query.toDateExclusive);
  }

  return filter;
}
