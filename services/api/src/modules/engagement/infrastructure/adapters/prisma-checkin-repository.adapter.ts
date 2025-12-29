import { Injectable } from "@nestjs/common";
import { PrismaService } from "@kerniflow/data";
import type {
  CheckInRepositoryPort,
  CheckInEventRecord,
  CheckInListFilters,
  Pagination,
  ListResult,
} from "../../application/ports/checkin-repository.port";

@Injectable()
export class PrismaCheckInRepositoryAdapter implements CheckInRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(record: CheckInEventRecord): Promise<void> {
    await this.prisma.checkInEvent.create({
      data: {
        id: record.checkInEventId,
        tenantId: record.tenantId,
        customerPartyId: record.customerPartyId,
        registerId: record.registerId,
        kioskDeviceId: record.kioskDeviceId ?? null,
        checkedInAt: record.checkedInAt,
        checkedInByType: record.checkedInByType,
        checkedInByEmployeePartyId: record.checkedInByEmployeePartyId ?? null,
        status: record.status,
        visitReason: record.visitReason ?? null,
        assignedEmployeePartyId: record.assignedEmployeePartyId ?? null,
        tags: record.tags ?? [],
        posSaleId: record.posSaleId ?? null,
        notes: record.notes ?? null,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
      },
    });
  }

  async update(record: CheckInEventRecord): Promise<void> {
    await this.prisma.checkInEvent.update({
      where: { id: record.checkInEventId },
      data: {
        status: record.status,
        visitReason: record.visitReason ?? null,
        assignedEmployeePartyId: record.assignedEmployeePartyId ?? null,
        tags: record.tags ?? [],
        posSaleId: record.posSaleId ?? null,
        notes: record.notes ?? null,
        updatedAt: record.updatedAt,
      },
    });
  }

  async findById(tenantId: string, checkInEventId: string): Promise<CheckInEventRecord | null> {
    const record = await this.prisma.checkInEvent.findFirst({
      where: { id: checkInEventId, tenantId },
    });
    return record ? this.toRecord(record) : null;
  }

  async list(
    tenantId: string,
    filters: CheckInListFilters,
    pagination: Pagination
  ): Promise<ListResult<CheckInEventRecord>> {
    const pageSize = pagination.pageSize;
    const rows = await this.prisma.checkInEvent.findMany({
      where: {
        tenantId,
        ...(filters.customerPartyId ? { customerPartyId: filters.customerPartyId } : {}),
        ...(filters.registerId ? { registerId: filters.registerId } : {}),
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.from || filters.to
          ? {
              checkedInAt: {
                ...(filters.from ? { gte: filters.from } : {}),
                ...(filters.to ? { lte: filters.to } : {}),
              },
            }
          : {}),
      },
      orderBy: { checkedInAt: "desc" },
      ...(pagination.cursor
        ? {
            cursor: { id: pagination.cursor },
            skip: 1,
          }
        : {}),
      take: pageSize + 1,
    });

    const items = rows.slice(0, pageSize).map((row) => this.toRecord(row));
    const nextCursor = rows.length > pageSize ? (rows[pageSize]?.id ?? null) : null;

    return { items, nextCursor };
  }

  async findRecentForCustomer(
    tenantId: string,
    customerPartyId: string,
    since: Date
  ): Promise<CheckInEventRecord[]> {
    const rows = await this.prisma.checkInEvent.findMany({
      where: {
        tenantId,
        customerPartyId,
        checkedInAt: { gte: since },
        status: { in: ["ACTIVE", "COMPLETED"] },
      },
      orderBy: { checkedInAt: "desc" },
    });
    return rows.map((row) => this.toRecord(row));
  }

  private toRecord(row: any): CheckInEventRecord {
    return {
      checkInEventId: row.id,
      tenantId: row.tenantId,
      customerPartyId: row.customerPartyId,
      registerId: row.registerId,
      kioskDeviceId: row.kioskDeviceId ?? null,
      checkedInAt: row.checkedInAt,
      checkedInByType: row.checkedInByType,
      checkedInByEmployeePartyId: row.checkedInByEmployeePartyId ?? null,
      status: row.status,
      visitReason: row.visitReason ?? null,
      assignedEmployeePartyId: row.assignedEmployeePartyId ?? null,
      tags: row.tags ?? [],
      posSaleId: row.posSaleId ?? null,
      notes: row.notes ?? null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
