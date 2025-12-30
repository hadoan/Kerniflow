import { Injectable } from "@nestjs/common";
import { PrismaService } from "@corely/data";
import { ShiftSession } from "../../domain/shift-session.aggregate";
import type { ShiftSessionRepositoryPort } from "../../application/ports/shift-session-repository.port";

@Injectable()
export class PrismaShiftSessionRepositoryAdapter implements ShiftSessionRepositoryPort {
  constructor(private prisma: PrismaService) {}

  async findById(workspaceId: string, sessionId: string): Promise<ShiftSession | null> {
    const record = await this.prisma.shiftSession.findUnique({
      where: {
        id: sessionId,
        workspaceId,
      },
    });

    return record ? this.toDomain(record) : null;
  }

  async findOpenByRegister(workspaceId: string, registerId: string): Promise<ShiftSession | null> {
    const record = await this.prisma.shiftSession.findFirst({
      where: {
        workspaceId,
        registerId,
        status: "OPEN",
      },
      orderBy: {
        openedAt: "desc",
      },
    });

    return record ? this.toDomain(record) : null;
  }

  async findByWorkspace(
    workspaceId: string,
    filters?: {
      registerId?: string;
      status?: "OPEN" | "CLOSED";
      fromDate?: Date;
      toDate?: Date;
    }
  ): Promise<ShiftSession[]> {
    const records = await this.prisma.shiftSession.findMany({
      where: {
        workspaceId,
        ...(filters?.registerId && { registerId: filters.registerId }),
        ...(filters?.status && { status: filters.status }),
        ...(filters?.fromDate && { openedAt: { gte: filters.fromDate } }),
        ...(filters?.toDate && { openedAt: { lte: filters.toDate } }),
      },
      orderBy: {
        openedAt: "desc",
      },
    });

    return records.map((r) => this.toDomain(r));
  }

  async save(session: ShiftSession): Promise<void> {
    await this.prisma.shiftSession.create({
      data: {
        id: session.id,
        workspaceId: session.workspaceId,
        registerId: session.registerId,
        openedByEmployeePartyId: session.openedByEmployeePartyId,
        openedAt: session.openedAt,
        startingCashCents: session.startingCashCents,
        status: session.status,
        closedAt: session.closedAt,
        closedByEmployeePartyId: session.closedByEmployeePartyId,
        closingCashCents: session.closingCashCents,
        totalSalesCents: session.totalSalesCents,
        totalCashReceivedCents: session.totalCashReceivedCents,
        varianceCents: session.varianceCents,
        notes: session.notes,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
      },
    });
  }

  async update(session: ShiftSession): Promise<void> {
    await this.prisma.shiftSession.update({
      where: {
        id: session.id,
      },
      data: {
        status: session.status,
        closedAt: session.closedAt,
        closedByEmployeePartyId: session.closedByEmployeePartyId,
        closingCashCents: session.closingCashCents,
        totalSalesCents: session.totalSalesCents,
        totalCashReceivedCents: session.totalCashReceivedCents,
        varianceCents: session.varianceCents,
        notes: session.notes,
        updatedAt: session.updatedAt,
      },
    });
  }

  private toDomain(record: any): ShiftSession {
    return new ShiftSession(
      record.id,
      record.registerId,
      record.workspaceId,
      record.openedByEmployeePartyId,
      record.openedAt,
      record.startingCashCents,
      record.status as "OPEN" | "CLOSED",
      record.closedAt,
      record.closedByEmployeePartyId,
      record.closingCashCents,
      record.totalSalesCents,
      record.totalCashReceivedCents,
      record.varianceCents,
      record.notes,
      record.createdAt,
      record.updatedAt
    );
  }
}
