import { Injectable } from "@nestjs/common";
import { PrismaService } from "@corely/data";
import type {
  LoyaltyRepositoryPort,
  LoyaltyAccountRecord,
  LoyaltyLedgerEntryRecord,
  Pagination,
  ListResult,
} from "../../application/ports/loyalty-repository.port";
import type { LoyaltyAccountStatus, LoyaltyReasonCode } from "../../domain/engagement.types";

@Injectable()
export class PrismaLoyaltyRepositoryAdapter implements LoyaltyRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async getAccountByCustomer(
    tenantId: string,
    customerPartyId: string
  ): Promise<LoyaltyAccountRecord | null> {
    const record = await this.prisma.loyaltyAccount.findUnique({
      where: { tenantId_customerPartyId: { tenantId, customerPartyId } },
    });
    return record ? this.toAccountRecord(record) : null;
  }

  async upsertAccount(
    tenantId: string,
    customerPartyId: string,
    status: LoyaltyAccountStatus
  ): Promise<LoyaltyAccountRecord> {
    const record = await this.prisma.loyaltyAccount.upsert({
      where: { tenantId_customerPartyId: { tenantId, customerPartyId } },
      update: { status },
      create: {
        tenantId,
        customerPartyId,
        status,
        currentPointsBalance: 0,
      },
    });
    return this.toAccountRecord(record);
  }

  async updateAccountBalance(
    tenantId: string,
    customerPartyId: string,
    newBalance: number
  ): Promise<void> {
    await this.prisma.loyaltyAccount.update({
      where: { tenantId_customerPartyId: { tenantId, customerPartyId } },
      data: { currentPointsBalance: newBalance },
    });
  }

  async createLedgerEntry(entry: LoyaltyLedgerEntryRecord): Promise<void> {
    await this.prisma.loyaltyLedgerEntry.create({
      data: {
        id: entry.entryId,
        tenantId: entry.tenantId,
        customerPartyId: entry.customerPartyId,
        entryType: entry.entryType,
        pointsDelta: entry.pointsDelta,
        reasonCode: entry.reasonCode,
        sourceType: entry.sourceType ?? null,
        sourceId: entry.sourceId ?? null,
        createdAt: entry.createdAt,
        createdByEmployeePartyId: entry.createdByEmployeePartyId ?? null,
      },
    });
  }

  async findLedgerEntryBySource(
    tenantId: string,
    sourceType: string,
    sourceId: string,
    reasonCode: LoyaltyReasonCode
  ): Promise<LoyaltyLedgerEntryRecord | null> {
    const record = await this.prisma.loyaltyLedgerEntry.findFirst({
      where: {
        tenantId,
        sourceType,
        sourceId,
        reasonCode,
      },
    });
    return record ? this.toLedgerRecord(record) : null;
  }

  async listLedger(
    tenantId: string,
    customerPartyId: string,
    pagination: Pagination
  ): Promise<ListResult<LoyaltyLedgerEntryRecord>> {
    const pageSize = pagination.pageSize;
    const rows = await this.prisma.loyaltyLedgerEntry.findMany({
      where: { tenantId, customerPartyId },
      orderBy: { createdAt: "desc" },
      ...(pagination.cursor
        ? {
            cursor: { id: pagination.cursor },
            skip: 1,
          }
        : {}),
      take: pageSize + 1,
    });

    const items = rows.slice(0, pageSize).map((row) => this.toLedgerRecord(row));
    const nextCursor = rows.length > pageSize ? (rows[pageSize]?.id ?? null) : null;

    return { items, nextCursor };
  }

  private toAccountRecord(row: any): LoyaltyAccountRecord {
    return {
      loyaltyAccountId: row.id,
      tenantId: row.tenantId,
      customerPartyId: row.customerPartyId,
      status: row.status,
      currentPointsBalance: row.currentPointsBalance,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private toLedgerRecord(row: any): LoyaltyLedgerEntryRecord {
    return {
      entryId: row.id,
      tenantId: row.tenantId,
      customerPartyId: row.customerPartyId,
      entryType: row.entryType,
      pointsDelta: row.pointsDelta,
      reasonCode: row.reasonCode,
      sourceType: row.sourceType ?? null,
      sourceId: row.sourceId ?? null,
      createdAt: row.createdAt,
      createdByEmployeePartyId: row.createdByEmployeePartyId ?? null,
    };
  }
}
