import { Injectable } from "@nestjs/common";
import { PrismaService } from "@corely/data";
import type {
  StockReservationRepositoryPort,
  ReservationFilters,
  ReservationListResult,
  ReservationSum,
} from "../../application/ports/stock-reservation-repository.port";
import type { StockReservation } from "../../domain/inventory.types";

@Injectable()
export class PrismaStockReservationRepository implements StockReservationRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async createMany(_tenantId: string, reservations: StockReservation[]): Promise<void> {
    if (!reservations.length) {
      return;
    }
    await this.prisma.stockReservation.createMany({
      data: reservations.map((reservation) => ({
        id: reservation.id,
        tenantId: reservation.tenantId,
        productId: reservation.productId,
        locationId: reservation.locationId,
        documentId: reservation.documentId,
        reservedQty: reservation.reservedQty,
        status: reservation.status as any,
        createdByUserId: reservation.createdByUserId ?? undefined,
        createdAt: reservation.createdAt,
        releasedAt: reservation.releasedAt ?? undefined,
        fulfilledAt: reservation.fulfilledAt ?? undefined,
      })),
    });
  }

  async list(tenantId: string, filters: ReservationFilters): Promise<ReservationListResult> {
    const where: any = { tenantId };
    if (filters.productId) {
      where.productId = filters.productId;
    }
    if (filters.documentId) {
      where.documentId = filters.documentId;
    }

    const take = filters.pageSize ?? 50;
    const results = await this.prisma.stockReservation.findMany({
      where,
      take,
      skip: filters.cursor ? 1 : 0,
      ...(filters.cursor ? { cursor: { id: filters.cursor } } : {}),
      orderBy: { createdAt: "desc" },
    });

    return {
      items: results.map((row) => ({
        id: row.id,
        tenantId: row.tenantId,
        productId: row.productId,
        locationId: row.locationId,
        documentId: row.documentId,
        reservedQty: row.reservedQty,
        status: row.status as any,
        createdAt: row.createdAt,
        releasedAt: row.releasedAt ?? null,
        fulfilledAt: row.fulfilledAt ?? null,
        createdByUserId: row.createdByUserId ?? null,
      })),
      nextCursor: results.length === take ? (results[results.length - 1]?.id ?? null) : null,
    };
  }

  async sumActiveByProductLocation(
    tenantId: string,
    filters: { productIds?: string[]; locationIds?: string[] }
  ): Promise<ReservationSum[]> {
    const where: any = { tenantId, status: "ACTIVE" };
    if (filters.productIds?.length) {
      where.productId = { in: filters.productIds };
    }
    if (filters.locationIds?.length) {
      where.locationId = { in: filters.locationIds };
    }

    const results = await this.prisma.stockReservation.groupBy({
      by: ["productId", "locationId"],
      where,
      _sum: { reservedQty: true },
    });

    return results.map((row) => ({
      productId: row.productId,
      locationId: row.locationId,
      reservedQty: row._sum.reservedQty ?? 0,
    }));
  }

  async releaseByDocument(tenantId: string, documentId: string, releasedAt: Date): Promise<void> {
    await this.prisma.stockReservation.updateMany({
      where: { tenantId, documentId, status: "ACTIVE" },
      data: { status: "RELEASED", releasedAt },
    });
  }

  async fulfillByDocument(tenantId: string, documentId: string, fulfilledAt: Date): Promise<void> {
    await this.prisma.stockReservation.updateMany({
      where: { tenantId, documentId, status: "ACTIVE" },
      data: { status: "FULFILLED", fulfilledAt },
    });
  }
}
