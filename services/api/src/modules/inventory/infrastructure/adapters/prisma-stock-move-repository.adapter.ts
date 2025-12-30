import { Injectable } from "@nestjs/common";
import { PrismaService } from "@corely/data";
import type {
  StockMoveRepositoryPort,
  StockMoveFilters,
  StockMoveListResult,
  StockMoveSum,
} from "../../application/ports/stock-move-repository.port";
import type { StockMove } from "../../domain/inventory.types";
import type { LocalDate } from "@corely/kernel";

const toPrismaDate = (localDate: LocalDate): Date => new Date(`${localDate}T00:00:00.000Z`);

const fromPrismaDate = (value: Date): LocalDate => value.toISOString().slice(0, 10) as LocalDate;

@Injectable()
export class PrismaStockMoveRepository implements StockMoveRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async createMany(_tenantId: string, moves: StockMove[]): Promise<void> {
    if (!moves.length) {
      return;
    }
    await this.prisma.stockMove.createMany({
      data: moves.map((move) => ({
        id: move.id,
        tenantId: move.tenantId,
        postingDate: toPrismaDate(move.postingDate),
        productId: move.productId,
        quantityDelta: move.quantityDelta,
        locationId: move.locationId,
        documentType: move.documentType as any,
        documentId: move.documentId,
        lineId: move.lineId,
        reasonCode: move.reasonCode as any,
        createdByUserId: move.createdByUserId ?? undefined,
        createdAt: move.createdAt,
      })),
    });
  }

  async list(tenantId: string, filters: StockMoveFilters): Promise<StockMoveListResult> {
    const where: any = { tenantId };
    if (filters.productId) {
      where.productId = filters.productId;
    }
    if (filters.locationIds && filters.locationIds.length) {
      where.locationId = { in: filters.locationIds };
    }
    if (filters.fromDate || filters.toDate) {
      where.postingDate = {};
      if (filters.fromDate) {
        where.postingDate.gte = new Date(`${filters.fromDate}T00:00:00.000Z`);
      }
      if (filters.toDate) {
        where.postingDate.lte = new Date(`${filters.toDate}T23:59:59.999Z`);
      }
    }

    const take = filters.pageSize ?? 50;
    const results = await this.prisma.stockMove.findMany({
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
        postingDate: fromPrismaDate(row.postingDate),
        productId: row.productId,
        quantityDelta: row.quantityDelta,
        locationId: row.locationId,
        documentType: row.documentType as any,
        documentId: row.documentId,
        lineId: row.lineId,
        reasonCode: row.reasonCode as any,
        createdAt: row.createdAt,
        createdByUserId: row.createdByUserId ?? null,
      })),
      nextCursor: results.length === take ? (results[results.length - 1]?.id ?? null) : null,
    };
  }

  async sumByProductLocation(
    tenantId: string,
    filters: { productIds?: string[]; locationIds?: string[] }
  ): Promise<StockMoveSum[]> {
    const where: any = { tenantId };
    if (filters.productIds?.length) {
      where.productId = { in: filters.productIds };
    }
    if (filters.locationIds?.length) {
      where.locationId = { in: filters.locationIds };
    }

    const results = await this.prisma.stockMove.groupBy({
      by: ["productId", "locationId"],
      where,
      _sum: { quantityDelta: true },
    });

    return results.map((row) => ({
      productId: row.productId,
      locationId: row.locationId,
      quantityDelta: row._sum.quantityDelta ?? 0,
    }));
  }
}
