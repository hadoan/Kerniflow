import { Injectable } from "@nestjs/common";
import {
  Prisma,
  type CashDayClose,
  type CashDayCloseCountLine,
  type CashEntry,
  type CashEntryAttachment,
  type CashExportArtifact,
  type CashRegister,
  type CashDayConfirmation,
  type CashDayCloseRevision,
  type CashEntryConfirmation,
  type CashWorkspaceHandoff,
} from "@prisma/client";
import { PrismaService, getPrismaClient } from "@corely/data";
import type { CashDayCloseStatus, CashEntryDirection, CashEntryType } from "@corely/contracts";
import type { TransactionContext } from "@corely/kernel";
import type {
  CashAttachmentRepoPort,
  CashDayCloseRepoPort,
  CashEntryRepoPort,
  CashExportRepoPort,
  CashRegisterRepoPort,
  CreateEntryRecord,
  CreateRegisterRecord,
  DayCloseListFilters,
  EntryListFilters,
  UpdateRegisterRecord,
  UpsertDayCloseRecord,
  CashConfirmationRepoPort,
  CreateCashConfirmationRecord,
  CashEntryConfirmationRepoPort,
  CreateCashEntryConfirmationRecord,
  CashWorkspaceHandoffRepoPort,
  CreateCashWorkspaceHandoffRecord,
  CreateCashDayCloseRevisionRecord,
} from "../../application/ports/cash-management.ports";
import type {
  CashDayCloseEntity,
  CashDenominationCountEntity,
  CashEntryAttachmentEntity,
  CashEntryEntity,
  CashExportArtifactEntity,
  CashRegisterEntity,
  CashDayConfirmationEntity,
  CashDayCloseRevisionEntity,
} from "../../domain/entities";

const monthStart = (month: string): string => `${month}-01`;
const monthEnd = (month: string): string => {
  const [year, monthNo] = month.split("-").map((value) => Number(value));
  const lastDay = new Date(Date.UTC(year, monthNo, 0)).getUTCDate();
  return `${month}-${String(lastDay).padStart(2, "0")}`;
};

@Injectable()
export class PrismaCashRepository
  implements
    CashRegisterRepoPort,
    CashEntryRepoPort,
    CashDayCloseRepoPort,
    CashAttachmentRepoPort,
    CashExportRepoPort,
    CashConfirmationRepoPort,
    CashEntryConfirmationRepoPort,
    CashWorkspaceHandoffRepoPort
{
  constructor(private readonly prisma: PrismaService) {}

  private client(tx?: TransactionContext): PrismaService {
    return getPrismaClient(this.prisma, tx);
  }

  async createRegister(
    data: CreateRegisterRecord,
    tx?: TransactionContext
  ): Promise<CashRegisterEntity> {
    const row = await this.client(tx).cashRegister.create({
      data: {
        tenantId: data.tenantId,
        workspaceId: data.workspaceId,
        name: data.name,
        location: data.location,
        currency: data.currency,
        disallowNegativeBalance: data.disallowNegativeBalance,
      },
    });

    return this.mapRegister(row);
  }

  async countDistinctLocationsForTenant(
    tenantId: string,
    tx?: TransactionContext
  ): Promise<number> {
    const rows = await this.client(tx).cashRegister.findMany({
      where: { tenantId },
      distinct: ["workspaceId"],
      select: { workspaceId: true },
    });

    return rows.length;
  }

  async listRegisters(
    tenantId: string,
    workspaceId: string,
    filters?: { q?: string; location?: string; currency?: string }
  ): Promise<CashRegisterEntity[]> {
    const where: Prisma.CashRegisterWhereInput = {
      tenantId,
      workspaceId,
      ...(filters?.q
        ? {
            OR: [
              { name: { contains: filters.q, mode: "insensitive" } },
              { location: { contains: filters.q, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(filters?.location
        ? { location: { contains: filters.location, mode: "insensitive" } }
        : {}),
      ...(filters?.currency ? { currency: filters.currency } : {}),
    };

    const rows = await this.prisma.cashRegister.findMany({
      where,
      orderBy: [{ createdAt: "desc" }],
    });

    return rows.map((row) => this.mapRegister(row));
  }

  async findRegisterById(
    tenantId: string,
    workspaceId: string,
    registerId: string,
    tx?: TransactionContext
  ): Promise<CashRegisterEntity | null> {
    const row = await this.client(tx).cashRegister.findFirst({
      where: { id: registerId, tenantId, workspaceId },
    });
    return row ? this.mapRegister(row) : null;
  }

  async updateRegister(
    tenantId: string,
    workspaceId: string,
    registerId: string,
    data: UpdateRegisterRecord,
    tx?: TransactionContext
  ): Promise<CashRegisterEntity> {
    const client = this.client(tx);
    const updated = await client.cashRegister.updateMany({
      where: { id: registerId, tenantId, workspaceId },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.location !== undefined ? { location: data.location } : {}),
        ...(data.disallowNegativeBalance !== undefined
          ? { disallowNegativeBalance: data.disallowNegativeBalance }
          : {}),
      },
    });

    if (updated.count === 0) {
      throw new Error("Cash register not found");
    }

    const row = await client.cashRegister.findFirstOrThrow({
      where: { id: registerId, tenantId, workspaceId },
    });
    return this.mapRegister(row);
  }

  async setCurrentBalance(
    tenantId: string,
    workspaceId: string,
    registerId: string,
    currentBalanceCents: number,
    tx?: TransactionContext
  ): Promise<void> {
    await this.client(tx).cashRegister.updateMany({
      where: { id: registerId, tenantId, workspaceId },
      data: { currentBalanceCents },
    });
  }

  async nextEntryNo(
    tenantId: string,
    workspaceId: string,
    registerId: string,
    tx?: TransactionContext
  ): Promise<number> {
    const client = this.client(tx);

    const updated = await client.cashEntryCounter.updateMany({
      where: { tenantId, workspaceId, registerId },
      data: { lastEntryNo: { increment: 1 } },
    });

    if (updated.count === 0) {
      try {
        await client.cashEntryCounter.create({
          data: {
            tenantId,
            workspaceId,
            registerId,
            lastEntryNo: 1,
          },
        });

        return 1;
      } catch (error: unknown) {
        if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
          throw error;
        }

        // Another request created the counter first. Retry increment.
        await client.cashEntryCounter.updateMany({
          where: { tenantId, workspaceId, registerId },
          data: { lastEntryNo: { increment: 1 } },
        });
      }
    }

    const counter = await client.cashEntryCounter.findFirstOrThrow({
      where: { tenantId, workspaceId, registerId },
      select: { lastEntryNo: true },
    });

    return counter.lastEntryNo;
  }

  async createEntry(data: CreateEntryRecord, tx?: TransactionContext): Promise<CashEntryEntity> {
    const row = await this.client(tx).cashEntry.create({
      data: {
        tenantId: data.tenantId,
        workspaceId: data.workspaceId,
        registerId: data.registerId,
        entryNo: data.entryNo,
        occurredAt: data.occurredAt,
        dayKey: data.dayKey,
        description: data.description,
        entryType: data.type,
        direction: data.direction,
        source: data.source,
        paymentMethod: data.paymentMethod,
        amountCents: data.amountCents,
        grossAmountCents: data.grossAmountCents,
        netAmountCents: data.netAmountCents,
        taxAmountCents: data.taxAmountCents,
        taxMode: data.taxMode,
        taxCodeId: data.taxCodeId,
        taxCode: data.taxCode,
        taxRateBps: data.taxRateBps,
        taxLabel: data.taxLabel,
        currency: data.currency,
        balanceAfterCents: data.balanceAfterCents,
        sourceDocumentId: data.sourceDocumentId,
        sourceDocumentRef: data.sourceDocumentRef,
        sourceDocumentKind: data.sourceDocumentKind,
        referenceId: data.referenceId,
        reversalOfEntryId: data.reversalOfEntryId,
        lockedByDayCloseId: data.lockedByDayCloseId,
        idempotencyKey: data.idempotencyKey ?? null,
        createdByUserId: data.createdByUserId,

        // Legacy compatibility columns
        type: data.direction,
        sourceType: data.source,
        businessDate: data.dayKey,
      },
    });

    return this.mapEntry(row);
  }

  async countEntriesForPeriod(
    tenantId: string,
    periodStart: Date,
    periodEnd: Date,
    tx?: TransactionContext
  ): Promise<number> {
    return this.client(tx).cashEntry.count({
      where: {
        tenantId,
        occurredAt: {
          gte: periodStart,
          lt: periodEnd,
        },
      },
    });
  }

  async listEntries(
    tenantId: string,
    workspaceId: string,
    filters: EntryListFilters
  ): Promise<CashEntryEntity[]> {
    const where: Prisma.CashEntryWhereInput = {
      tenantId,
      workspaceId,
      registerId: filters.registerId,
      ...(filters.dayKeyFrom || filters.dayKeyTo
        ? {
            dayKey: {
              ...(filters.dayKeyFrom ? { gte: filters.dayKeyFrom } : {}),
              ...(filters.dayKeyTo ? { lte: filters.dayKeyTo } : {}),
            },
          }
        : {}),
      ...(filters.type ? { entryType: filters.type } : {}),
      ...(filters.source ? { source: filters.source } : {}),
      ...(filters.paymentMethod ? { paymentMethod: filters.paymentMethod } : {}),
      ...(filters.q
        ? {
            OR: [
              { description: { contains: filters.q, mode: "insensitive" } },
              { referenceId: { contains: filters.q, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const rows = await this.prisma.cashEntry.findMany({
      where,
      orderBy: [{ occurredAt: "desc" }, { entryNo: "desc" }],
    });

    return rows.map((row) => this.mapEntry(row));
  }

  async findEntryById(
    tenantId: string,
    workspaceId: string,
    entryId: string,
    tx?: TransactionContext
  ): Promise<CashEntryEntity | null> {
    const row = await this.client(tx).cashEntry.findFirst({
      where: { id: entryId, tenantId, workspaceId },
    });

    return row ? this.mapEntry(row) : null;
  }

  async findActivePossibleDuplicate(
    tenantId: string,
    workspaceId: string,
    input: {
      registerId: string;
      dayKey: string;
      type: CashEntryType;
      direction: CashEntryDirection;
      amountCents: number;
      source: string;
    },
    tx?: TransactionContext
  ): Promise<CashEntryEntity | null> {
    const row = await this.client(tx).cashEntry.findFirst({
      where: {
        tenantId,
        workspaceId,
        registerId: input.registerId,
        dayKey: input.dayKey,
        entryType: input.type,
        direction: input.direction,
        amountCents: input.amountCents,
        source: input.source,
        reversedByEntryId: null,
      },
      orderBy: { createdAt: "desc" },
    });
    return row ? this.mapEntry(row) : null;
  }

  async findEntryByIdempotencyKey(
    tenantId: string,
    workspaceId: string,
    idempotencyKey: string,
    tx?: TransactionContext
  ): Promise<CashEntryEntity | null> {
    const row = await this.client(tx).cashEntry.findFirst({
      where: { tenantId, workspaceId, idempotencyKey },
    });
    return row ? this.mapEntry(row) : null;
  }

  async findActiveDailyZReport(
    tenantId: string,
    workspaceId: string,
    registerId: string,
    dayKey: string,
    tx?: TransactionContext
  ): Promise<CashEntryEntity | null> {
    const row = await this.client(tx).cashEntry.findFirst({
      where: {
        tenantId,
        workspaceId,
        registerId,
        dayKey,
        entryType: "SALE_CASH",
        sourceDocumentKind: "DAILY_Z_REPORT",
        reversedByEntryId: null,
      },
    });
    return row ? this.mapEntry(row) : null;
  }

  async setReversedByEntryId(
    tenantId: string,
    workspaceId: string,
    entryId: string,
    reversedByEntryId: string,
    tx?: TransactionContext
  ): Promise<void> {
    await this.client(tx).cashEntry.updateMany({
      where: {
        id: entryId,
        tenantId,
        workspaceId,
      },
      data: {
        reversedByEntryId,
      },
    });
  }

  async listEntriesForMonth(
    tenantId: string,
    workspaceId: string,
    registerId: string,
    month: string
  ): Promise<CashEntryEntity[]> {
    const rows = await this.prisma.cashEntry.findMany({
      where: {
        tenantId,
        workspaceId,
        registerId,
        dayKey: {
          gte: monthStart(month),
          lte: monthEnd(month),
        },
      },
      orderBy: [{ occurredAt: "asc" }, { entryNo: "asc" }],
    });

    return rows.map((row) => this.mapEntry(row));
  }

  async getExpectedBalanceAtDay(
    tenantId: string,
    workspaceId: string,
    registerId: string,
    dayKey: string,
    tx?: TransactionContext
  ): Promise<number> {
    const client = this.client(tx);
    const rows = await client.$queryRaw<Array<{ balance: bigint | number | null }>>`
      SELECT COALESCE(SUM(CASE WHEN "direction" = 'OUT' THEN -"amountCents" ELSE "amountCents" END), 0) AS balance
      FROM "accounting"."cash_entries"
      WHERE "tenantId" = ${tenantId}
        AND "workspaceId" = ${workspaceId}
        AND "registerId" = ${registerId}
        AND "dayKey" <= ${dayKey}
    `;

    const balance = rows[0]?.balance ?? 0;
    return typeof balance === "bigint" ? Number(balance) : balance;
  }

  async lockEntriesForDay(
    tenantId: string,
    workspaceId: string,
    registerId: string,
    dayKey: string,
    dayCloseId: string,
    tx?: TransactionContext
  ): Promise<void> {
    await this.client(tx).cashEntry.updateMany({
      where: {
        tenantId,
        workspaceId,
        registerId,
        dayKey,
        lockedByDayCloseId: null,
      },
      data: {
        lockedByDayCloseId: dayCloseId,
      },
    });
  }

  async findDayCloseByRegisterAndDay(
    tenantId: string,
    workspaceId: string,
    registerId: string,
    dayKey: string,
    tx?: TransactionContext
  ): Promise<CashDayCloseEntity | null> {
    const row = await this.client(tx).cashDayClose.findFirst({
      where: {
        tenantId,
        workspaceId,
        registerId,
        dayKey,
      },
      include: {
        countLines: true,
      },
    });

    return row ? this.mapDayClose(row, row.countLines) : null;
  }

  async upsertDayClose(
    data: UpsertDayCloseRecord,
    tx?: TransactionContext
  ): Promise<CashDayCloseEntity> {
    const row = await this.client(tx).cashDayClose.upsert({
      where: {
        tenantId_workspaceId_registerId_dayKey: {
          tenantId: data.tenantId,
          workspaceId: data.workspaceId,
          registerId: data.registerId,
          dayKey: data.dayKey,
        },
      },
      update: {
        status: data.status,
        expectedBalanceCents: data.expectedBalanceCents,
        countedBalanceCents: data.countedBalanceCents,
        differenceCents: data.differenceCents,
        note: data.note,
        submittedAt: data.submittedAt,
        submittedByUserId: data.submittedByUserId,
        lockedAt: data.lockedAt,
        lockedByUserId: data.lockedByUserId,
        businessDate: data.dayKey,
      },
      create: {
        tenantId: data.tenantId,
        workspaceId: data.workspaceId,
        registerId: data.registerId,
        dayKey: data.dayKey,
        status: data.status,
        expectedBalanceCents: data.expectedBalanceCents,
        countedBalanceCents: data.countedBalanceCents,
        differenceCents: data.differenceCents,
        note: data.note,
        submittedAt: data.submittedAt,
        submittedByUserId: data.submittedByUserId,
        lockedAt: data.lockedAt,
        lockedByUserId: data.lockedByUserId,
        businessDate: data.dayKey,
      },
      include: {
        countLines: true,
      },
    });

    return this.mapDayClose(row, row.countLines);
  }

  async replaceCountLines(
    tenantId: string,
    workspaceId: string,
    dayCloseId: string,
    lines: CashDenominationCountEntity[],
    tx?: TransactionContext
  ): Promise<void> {
    const client = this.client(tx);

    await client.cashDayCloseCountLine.deleteMany({
      where: {
        tenantId,
        workspaceId,
        dayCloseId,
      },
    });

    if (lines.length === 0) {
      return;
    }

    await client.cashDayCloseCountLine.createMany({
      data: lines.map((line) => ({
        tenantId,
        workspaceId,
        dayCloseId,
        denominationCents: line.denominationCents,
        count: line.count,
        subtotalCents: line.subtotalCents,
      })),
    });
  }

  async listDayCloses(
    tenantId: string,
    workspaceId: string,
    filters?: DayCloseListFilters
  ): Promise<CashDayCloseEntity[]> {
    const where: Prisma.CashDayCloseWhereInput = {
      tenantId,
      workspaceId,
      ...(filters?.registerId ? { registerId: filters.registerId } : {}),
      ...(filters?.dayKeyFrom || filters?.dayKeyTo
        ? {
            dayKey: {
              ...(filters.dayKeyFrom ? { gte: filters.dayKeyFrom } : {}),
              ...(filters.dayKeyTo ? { lte: filters.dayKeyTo } : {}),
            },
          }
        : {}),
      ...(filters?.status ? { status: filters.status } : {}),
    };

    const rows = await this.prisma.cashDayClose.findMany({
      where,
      include: {
        countLines: true,
      },
      orderBy: [{ dayKey: "desc" }],
    });

    return rows.map((row) => this.mapDayClose(row, row.countLines));
  }

  async listDayClosesForMonth(
    tenantId: string,
    workspaceId: string,
    registerId: string,
    month: string
  ): Promise<CashDayCloseEntity[]> {
    const rows = await this.prisma.cashDayClose.findMany({
      where: {
        tenantId,
        workspaceId,
        registerId,
        dayKey: {
          gte: monthStart(month),
          lte: monthEnd(month),
        },
      },
      include: {
        countLines: true,
      },
      orderBy: [{ dayKey: "asc" }],
    });

    return rows.map((row) => this.mapDayClose(row, row.countLines));
  }

  async createRevision(
    data: CreateCashDayCloseRevisionRecord,
    tx?: TransactionContext
  ): Promise<CashDayCloseRevisionEntity> {
    const client = this.client(tx);
    const latest = await client.cashDayCloseRevision.aggregate({
      where: { dayCloseId: data.dayCloseId },
      _max: { revisionNo: true },
    });
    const row = await client.cashDayCloseRevision.create({
      data: {
        tenantId: data.tenantId,
        workspaceId: data.workspaceId,
        registerId: data.registerId,
        dayCloseId: data.dayCloseId,
        correctionEntryId: data.correctionEntryId,
        revisionNo: (latest._max.revisionNo ?? 1) + 1,
        correctionType: data.correctionType,
        reason: data.reason,
        occurredAt: data.occurredAt,
        createdByUserId: data.createdByUserId,
        originalSnapshot: data.originalSnapshot,
        correctedSnapshot: data.correctedSnapshot,
      },
    });
    return this.mapRevision(row);
  }

  async createReviewRequirements(
    tenantId: string,
    workspaceId: string,
    revisionId: string,
    affectedDayCloseIds: string[],
    tx?: TransactionContext
  ): Promise<void> {
    if (affectedDayCloseIds.length === 0) {
      return;
    }
    await this.client(tx).cashDayCloseReviewRequirement.createMany({
      data: affectedDayCloseIds.map((affectedDayCloseId) => ({
        tenantId,
        workspaceId,
        revisionId,
        affectedDayCloseId,
      })),
      skipDuplicates: true,
    });
  }

  async listRevisions(
    tenantId: string,
    workspaceId: string,
    registerId: string,
    dayKey: string
  ): Promise<CashDayCloseRevisionEntity[]> {
    const rows = await this.prisma.cashDayCloseRevision.findMany({
      where: { tenantId, workspaceId, registerId, dayClose: { dayKey } },
      include: { reviewRequirements: { select: { id: true } } },
      orderBy: { revisionNo: "asc" },
    });
    return rows.map((row) => this.mapRevision(row, row.reviewRequirements.length > 0));
  }

  async createAttachment(
    data: {
      tenantId: string;
      workspaceId: string;
      entryId: string;
      documentId: string;
      uploadedByUserId: string | null;
    },
    tx?: TransactionContext
  ): Promise<CashEntryAttachmentEntity> {
    const row = await this.client(tx).cashEntryAttachment.create({
      data: {
        tenantId: data.tenantId,
        workspaceId: data.workspaceId,
        entryId: data.entryId,
        documentId: data.documentId,
        uploadedByUserId: data.uploadedByUserId,
      },
    });
    return this.mapAttachment(row);
  }

  async findAttachmentByEntryAndDocument(
    tenantId: string,
    workspaceId: string,
    entryId: string,
    documentId: string
  ): Promise<CashEntryAttachmentEntity | null> {
    const row = await this.prisma.cashEntryAttachment.findFirst({
      where: {
        tenantId,
        workspaceId,
        entryId,
        documentId,
      },
    });

    return row ? this.mapAttachment(row) : null;
  }

  async listAttachments(
    tenantId: string,
    workspaceId: string,
    entryId: string
  ): Promise<CashEntryAttachmentEntity[]> {
    const rows = await this.prisma.cashEntryAttachment.findMany({
      where: {
        tenantId,
        workspaceId,
        entryId,
      },
      orderBy: [{ createdAt: "desc" }],
    });

    return rows.map((row) => this.mapAttachment(row));
  }

  async countAttachmentsForPeriod(
    tenantId: string,
    periodStart: Date,
    periodEnd: Date,
    tx?: TransactionContext
  ): Promise<number> {
    return this.client(tx).cashEntryAttachment.count({
      where: {
        tenantId,
        createdAt: {
          gte: periodStart,
          lt: periodEnd,
        },
      },
    });
  }

  async listAttachmentsForMonth(
    tenantId: string,
    workspaceId: string,
    registerId: string,
    month: string
  ): Promise<CashEntryAttachmentEntity[]> {
    const rows = await this.prisma.cashEntryAttachment.findMany({
      where: {
        tenantId,
        workspaceId,
        entry: {
          registerId,
          dayKey: {
            gte: monthStart(month),
            lte: monthEnd(month),
          },
        },
      },
      orderBy: [{ createdAt: "asc" }],
    });

    return rows.map((row) => this.mapAttachment(row));
  }

  async createArtifact(
    data: {
      tenantId: string;
      workspaceId: string;
      registerId: string;
      month: string;
      format: "CSV" | "PDF" | "DATEV" | "AUDIT_PACK";
      fileName: string;
      contentType: string;
      contentBase64: string;
      sizeBytes: number;
      createdByUserId: string | null;
      expiresAt: Date | null;
    },
    tx?: TransactionContext
  ): Promise<CashExportArtifactEntity> {
    const row = await this.client(tx).cashExportArtifact.create({
      data: {
        tenantId: data.tenantId,
        workspaceId: data.workspaceId,
        registerId: data.registerId,
        month: data.month,
        format: data.format,
        fileName: data.fileName,
        contentType: data.contentType,
        contentBase64: data.contentBase64,
        sizeBytes: data.sizeBytes,
        createdByUserId: data.createdByUserId,
        expiresAt: data.expiresAt,
      },
    });

    return this.mapArtifact(row);
  }

  async findArtifactById(
    tenantId: string,
    workspaceId: string,
    artifactId: string
  ): Promise<CashExportArtifactEntity | null> {
    const row = await this.prisma.cashExportArtifact.findFirst({
      where: {
        id: artifactId,
        tenantId,
        workspaceId,
      },
    });

    return row ? this.mapArtifact(row) : null;
  }

  async findLatestArtifact(
    tenantId: string,
    workspaceId: string,
    registerId: string,
    month?: string
  ): Promise<CashExportArtifactEntity | null> {
    const row = await this.prisma.cashExportArtifact.findFirst({
      where: {
        tenantId,
        workspaceId,
        registerId,
        ...(month ? { month } : {}),
      },
      orderBy: [{ createdAt: "desc" }],
    });

    return row ? this.mapArtifact(row) : null;
  }

  async listAuditRowsForMonth(
    tenantId: string,
    month: string
  ): Promise<
    Array<{
      action: string;
      entity: string;
      entityId: string;
      actorUserId: string | null;
      createdAt: Date;
      details: string | null;
    }>
  > {
    const start = new Date(`${month}-01T00:00:00.000Z`);
    const end = new Date(start);
    end.setUTCMonth(end.getUTCMonth() + 1);

    const rows = await this.prisma.auditLog.findMany({
      where: {
        tenantId,
        createdAt: {
          gte: start,
          lt: end,
        },
        action: {
          startsWith: "cash.",
        },
      },
      orderBy: [{ createdAt: "asc" }],
      select: {
        action: true,
        entity: true,
        entityId: true,
        actorUserId: true,
        createdAt: true,
        details: true,
      },
    });

    return rows;
  }

  async createConfirmation(
    data: CreateCashConfirmationRecord,
    tx?: TransactionContext
  ): Promise<CashDayConfirmationEntity> {
    const row = await this.client(tx).cashDayConfirmation.create({
      data: {
        tenantId: data.tenantId,
        workspaceId: data.workspaceId,
        registerId: data.registerId,
        conversationId: data.conversationId,
        preparedByUserId: data.preparedByUserId,
        businessDate: data.businessDate,
        candidatePayload: data.candidatePayload as Prisma.InputJsonValue,
        candidateHash: data.candidateHash,
        version: data.version,
        status: data.status,
        expiresAt: data.expiresAt,
      },
    });
    return this.mapConfirmation(row);
  }

  async findConfirmationById(
    tenantId: string,
    workspaceId: string,
    id: string,
    tx?: TransactionContext
  ): Promise<CashDayConfirmationEntity | null> {
    const row = await this.client(tx).cashDayConfirmation.findFirst({
      where: { id, tenantId, workspaceId },
    });
    return row ? this.mapConfirmation(row) : null;
  }

  async markConsumed(
    tenantId: string,
    workspaceId: string,
    id: string,
    tx?: TransactionContext
  ): Promise<void> {
    await this.client(tx).cashDayConfirmation.updateMany({
      where: { id, tenantId, workspaceId },
      data: {
        status: "CONSUMED",
        consumedAt: new Date(),
      },
    });
  }

  async markExpired(
    tenantId: string,
    workspaceId: string,
    id: string,
    tx?: TransactionContext
  ): Promise<void> {
    await this.client(tx).cashDayConfirmation.updateMany({
      where: { id, tenantId, workspaceId },
      data: {
        status: "EXPIRED",
      },
    });
  }

  private mapConfirmation(row: CashDayConfirmation): CashDayConfirmationEntity {
    return {
      id: row.id,
      tenantId: row.tenantId,
      workspaceId: row.workspaceId,
      registerId: row.registerId,
      conversationId: row.conversationId,
      preparedByUserId: row.preparedByUserId,
      businessDate: row.businessDate,
      candidatePayload: row.candidatePayload,
      candidateHash: row.candidateHash,
      version: row.version,
      status: row.status as "PENDING" | "CONFIRMED" | "CONSUMED" | "EXPIRED",
      expiresAt: row.expiresAt,
      confirmedAt: row.confirmedAt,
      consumedAt: row.consumedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private mapRegister(row: CashRegister): CashRegisterEntity {
    return {
      id: row.id,
      tenantId: row.tenantId,
      workspaceId: row.workspaceId,
      name: row.name,
      location: row.location,
      currency: row.currency,
      currentBalanceCents: row.currentBalanceCents,
      disallowNegativeBalance: row.disallowNegativeBalance,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private mapEntry(row: CashEntry): CashEntryEntity {
    return {
      id: row.id,
      tenantId: row.tenantId,
      workspaceId: row.workspaceId,
      registerId: row.registerId,
      entryNo: row.entryNo,
      occurredAt: row.occurredAt,
      dayKey: row.dayKey,
      description: row.description,
      type: row.entryType as CashEntryType,
      direction: row.direction as CashEntryDirection,
      source: row.source,
      paymentMethod: row.paymentMethod,
      amountCents: row.amountCents,
      grossAmountCents: row.grossAmountCents,
      netAmountCents: row.netAmountCents,
      taxAmountCents: row.taxAmountCents,
      taxMode: row.taxMode as CashEntryEntity["taxMode"],
      taxCodeId: row.taxCodeId,
      taxCode: row.taxCode,
      taxRateBps: row.taxRateBps,
      taxLabel: row.taxLabel,
      currency: row.currency,
      balanceAfterCents: row.balanceAfterCents,
      sourceDocumentId: row.sourceDocumentId,
      sourceDocumentRef: row.sourceDocumentRef,
      sourceDocumentKind: row.sourceDocumentKind,
      referenceId: row.referenceId,
      reversalOfEntryId: row.reversalOfEntryId,
      reversedByEntryId: row.reversedByEntryId,
      lockedByDayCloseId: row.lockedByDayCloseId,
      createdAt: row.createdAt,
      createdByUserId: row.createdByUserId,
    };
  }

  private mapDayClose(row: CashDayClose, countLines: CashDayCloseCountLine[]): CashDayCloseEntity {
    return {
      id: row.id,
      tenantId: row.tenantId,
      workspaceId: row.workspaceId,
      registerId: row.registerId,
      dayKey: row.dayKey,
      expectedBalanceCents: row.expectedBalanceCents,
      countedBalanceCents: row.countedBalanceCents,
      differenceCents: row.differenceCents,
      status: row.status as CashDayCloseStatus,
      note: row.note,
      submittedAt: row.submittedAt,
      submittedByUserId: row.submittedByUserId,
      lockedAt: row.lockedAt,
      lockedByUserId: row.lockedByUserId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      counts: countLines.map((line) => ({
        denominationCents: line.denominationCents,
        count: line.count,
        subtotalCents: line.subtotalCents,
      })),
    };
  }

  private mapRevision(
    row: CashDayCloseRevision,
    downstreamReviewRequired = false
  ): CashDayCloseRevisionEntity {
    return {
      id: row.id,
      tenantId: row.tenantId,
      workspaceId: row.workspaceId,
      registerId: row.registerId,
      dayCloseId: row.dayCloseId,
      correctionEntryId: row.correctionEntryId,
      revisionNo: row.revisionNo,
      correctionType: row.correctionType,
      reason: row.reason,
      occurredAt: row.occurredAt,
      recordedAt: row.recordedAt,
      createdByUserId: row.createdByUserId,
      downstreamReviewRequired,
    };
  }

  private mapAttachment(row: CashEntryAttachment): CashEntryAttachmentEntity {
    return {
      id: row.id,
      tenantId: row.tenantId,
      workspaceId: row.workspaceId,
      entryId: row.entryId,
      documentId: row.documentId,
      uploadedByUserId: row.uploadedByUserId,
      createdAt: row.createdAt,
    };
  }

  private mapArtifact(row: CashExportArtifact): CashExportArtifactEntity {
    return {
      id: row.id,
      tenantId: row.tenantId,
      workspaceId: row.workspaceId,
      registerId: row.registerId,
      month: row.month,
      format: row.format,
      fileName: row.fileName,
      contentType: row.contentType,
      contentBase64: row.contentBase64,
      sizeBytes: row.sizeBytes,
      createdByUserId: row.createdByUserId,
      createdAt: row.createdAt,
      expiresAt: row.expiresAt,
    };
  }

  async createHandoff(
    data: CreateCashWorkspaceHandoffRecord,
    tx?: TransactionContext
  ): Promise<any> {
    const row = await this.client(tx).cashWorkspaceHandoff.create({
      data: {
        tenantId: data.tenantId,
        locationId: data.locationId,
        registerId: data.registerId,
        sourceWorkspaceId: data.sourceWorkspaceId,
        targetWorkspaceId: data.targetWorkspaceId,
        sourceConversationId: data.sourceConversationId,
        sourceMessageId: data.sourceMessageId,
        businessDate: data.businessDate,
        movementType: data.movementType,
        amountCents: data.amountCents,
        description: data.description,
        evidenceRequirement: data.evidenceRequirement,
        candidateHash: data.candidateHash,
        version: data.version,
        confirmationId: data.confirmationId,
        status: data.status,
        expiresAt: data.expiresAt,
      },
    });

    return row;
  }

  async findHandoffById(
    tenantId: string,
    id: string,
    tx?: TransactionContext
  ): Promise<any | null> {
    const row = await this.client(tx).cashWorkspaceHandoff.findFirst({
      where: { id, tenantId },
    });
    return row;
  }

  async getHandoffForUpdate(id: string, tx?: TransactionContext): Promise<any | null> {
    const rows = await this.client(tx).$queryRaw<any[]>`
      SELECT * FROM accounting.cash_workspace_handoffs
      WHERE id = ${id}
      FOR UPDATE
    `;
    return rows[0] ?? null;
  }

  async markHandoffViewed(id: string, userId: string, tx?: TransactionContext): Promise<void> {
    await this.client(tx).cashWorkspaceHandoff.update({
      where: { id },
      data: { viewedAt: new Date(), viewedByUserId: userId },
    });
  }

  async markHandoffConsumed(id: string, tx?: TransactionContext): Promise<void> {
    await this.client(tx).cashWorkspaceHandoff.update({
      where: { id },
      data: { status: "CONSUMED", consumedAt: new Date() },
    });
  }

  async markHandoffCancelled(id: string, tx?: TransactionContext): Promise<void> {
    await this.client(tx).cashWorkspaceHandoff.update({
      where: { id },
      data: { status: "CANCELLED", cancelledAt: new Date() },
    });
  }

  async createEntryConfirmation(
    data: CreateCashEntryConfirmationRecord,
    tx?: TransactionContext
  ): Promise<any> {
    const row = await this.client(tx).cashEntryConfirmation.create({
      data: {
        tenantId: data.tenantId,
        workspaceId: data.workspaceId,
        registerId: data.registerId,
        conversationId: data.conversationId,
        preparedByUserId: data.preparedByUserId,
        businessDate: data.businessDate,
        candidatePayload: data.candidatePayload as Prisma.InputJsonValue,
        candidateHash: data.candidateHash,
        version: data.version,
        status: data.status,
        expiresAt: data.expiresAt,
      },
    });
    return row;
  }

  async findEntryConfirmationById(
    tenantId: string,
    workspaceId: string,
    id: string,
    tx?: TransactionContext
  ): Promise<any | null> {
    const row = await this.client(tx).cashEntryConfirmation.findFirst({
      where: { id, tenantId, workspaceId },
    });
    return row;
  }

  async markEntryConfirmationConsumed(
    tenantId: string,
    workspaceId: string,
    id: string,
    entryId: string,
    tx?: TransactionContext
  ): Promise<void> {
    await this.client(tx).cashEntryConfirmation.updateMany({
      where: { id, tenantId, workspaceId, status: "PENDING" },
      data: { status: "CONSUMED", consumedAt: new Date(), consumedEntryId: entryId },
    });
  }

  async markEntryConfirmationExpired(
    tenantId: string,
    workspaceId: string,
    id: string,
    tx?: TransactionContext
  ): Promise<void> {
    await this.client(tx).cashEntryConfirmation.updateMany({
      where: { id, tenantId, workspaceId, status: "PENDING" },
      data: { status: "EXPIRED" },
    });
  }
}
