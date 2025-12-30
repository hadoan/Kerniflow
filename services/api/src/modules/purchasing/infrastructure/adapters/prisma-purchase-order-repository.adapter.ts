import { Injectable } from "@nestjs/common";
import { PrismaService } from "@corely/data";
import type {
  PurchaseOrderRepositoryPort,
  ListPurchaseOrdersResult,
  ListPurchaseOrdersFilters,
} from "../../application/ports/purchase-order-repository.port";
import { PurchaseOrderAggregate } from "../../domain/purchase-order.aggregate";
import type { PurchaseOrderLineItem } from "../../domain/purchasing.types";
import type { LocalDate } from "@corely/kernel";

const toPrismaDate = (localDate: LocalDate | null): Date | null =>
  localDate ? new Date(`${localDate}T00:00:00.000Z`) : null;

const fromPrismaDate = (value: Date | null | undefined): LocalDate | null =>
  value ? (value.toISOString().slice(0, 10) as LocalDate) : null;

@Injectable()
export class PrismaPurchaseOrderRepository implements PurchaseOrderRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async save(tenantId: string, purchaseOrder: PurchaseOrderAggregate): Promise<void> {
    if (tenantId !== purchaseOrder.tenantId) {
      throw new Error("Tenant mismatch when saving purchase order");
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.purchaseOrder.upsert({
        where: { id: purchaseOrder.id },
        update: {
          poNumber: purchaseOrder.poNumber,
          status: purchaseOrder.status as any,
          supplierPartyId: purchaseOrder.supplierPartyId,
          supplierContactPartyId: purchaseOrder.supplierContactPartyId,
          orderDate: toPrismaDate(purchaseOrder.orderDate),
          expectedDeliveryDate: toPrismaDate(purchaseOrder.expectedDeliveryDate),
          currency: purchaseOrder.currency,
          notes: purchaseOrder.notes,
          subtotalCents: purchaseOrder.totals.subtotalCents,
          taxCents: purchaseOrder.totals.taxCents,
          totalCents: purchaseOrder.totals.totalCents,
          approvedAt: purchaseOrder.approvedAt,
          sentAt: purchaseOrder.sentAt,
          receivedAt: purchaseOrder.receivedAt,
          closedAt: purchaseOrder.closedAt,
          canceledAt: purchaseOrder.canceledAt,
          updatedAt: purchaseOrder.updatedAt,
        },
        create: {
          id: purchaseOrder.id,
          tenantId: purchaseOrder.tenantId,
          poNumber: purchaseOrder.poNumber,
          status: purchaseOrder.status as any,
          supplierPartyId: purchaseOrder.supplierPartyId,
          supplierContactPartyId: purchaseOrder.supplierContactPartyId,
          orderDate: toPrismaDate(purchaseOrder.orderDate),
          expectedDeliveryDate: toPrismaDate(purchaseOrder.expectedDeliveryDate),
          currency: purchaseOrder.currency,
          notes: purchaseOrder.notes,
          subtotalCents: purchaseOrder.totals.subtotalCents,
          taxCents: purchaseOrder.totals.taxCents,
          totalCents: purchaseOrder.totals.totalCents,
          approvedAt: purchaseOrder.approvedAt,
          sentAt: purchaseOrder.sentAt,
          receivedAt: purchaseOrder.receivedAt,
          closedAt: purchaseOrder.closedAt,
          canceledAt: purchaseOrder.canceledAt,
          createdAt: purchaseOrder.createdAt,
          updatedAt: purchaseOrder.updatedAt,
        },
      });

      await tx.purchaseOrderLine.deleteMany({ where: { purchaseOrderId: purchaseOrder.id } });
      if (purchaseOrder.lineItems.length) {
        await tx.purchaseOrderLine.createMany({
          data: purchaseOrder.lineItems.map((line) => ({
            id: line.id,
            purchaseOrderId: purchaseOrder.id,
            description: line.description,
            quantity: line.quantity,
            unitCostCents: line.unitCostCents,
            taxCode: line.taxCode,
            category: line.category,
            sortOrder: line.sortOrder,
          })),
        });
      }
    });
  }

  async create(tenantId: string, purchaseOrder: PurchaseOrderAggregate): Promise<void> {
    await this.save(tenantId, purchaseOrder);
  }

  async findById(
    tenantId: string,
    purchaseOrderId: string
  ): Promise<PurchaseOrderAggregate | null> {
    const data = await this.prisma.purchaseOrder.findFirst({
      where: { id: purchaseOrderId, tenantId },
      include: { lines: true },
    });
    if (!data) {
      return null;
    }

    const lineItems: PurchaseOrderLineItem[] = data.lines.map((line) => ({
      id: line.id,
      description: line.description,
      quantity: line.quantity,
      unitCostCents: line.unitCostCents,
      taxCode: line.taxCode ?? undefined,
      category: line.category ?? undefined,
      sortOrder: line.sortOrder ?? undefined,
    }));

    return new PurchaseOrderAggregate({
      id: data.id,
      tenantId: data.tenantId,
      poNumber: data.poNumber ?? null,
      status: data.status as any,
      supplierPartyId: data.supplierPartyId,
      supplierContactPartyId: data.supplierContactPartyId ?? null,
      orderDate: fromPrismaDate(data.orderDate),
      expectedDeliveryDate: fromPrismaDate(data.expectedDeliveryDate),
      currency: data.currency,
      notes: data.notes ?? null,
      lineItems,
      totals: {
        subtotalCents: data.subtotalCents,
        taxCents: data.taxCents,
        totalCents: data.totalCents,
      },
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      approvedAt: data.approvedAt ?? null,
      sentAt: data.sentAt ?? null,
      receivedAt: data.receivedAt ?? null,
      closedAt: data.closedAt ?? null,
      canceledAt: data.canceledAt ?? null,
    });
  }

  async list(
    tenantId: string,
    filters: ListPurchaseOrdersFilters
  ): Promise<ListPurchaseOrdersResult> {
    const where: any = { tenantId };
    if (filters.status) {
      where.status = filters.status;
    }
    if (filters.supplierPartyId) {
      where.supplierPartyId = filters.supplierPartyId;
    }
    if (filters.search) {
      where.OR = [
        { poNumber: { contains: filters.search, mode: "insensitive" } },
        { notes: { contains: filters.search, mode: "insensitive" } },
      ];
    }
    if (filters.fromDate || filters.toDate) {
      where.createdAt = {};
      if (filters.fromDate) {
        where.createdAt.gte = new Date(`${filters.fromDate}T00:00:00.000Z`);
      }
      if (filters.toDate) {
        where.createdAt.lte = new Date(`${filters.toDate}T23:59:59.999Z`);
      }
    }

    const take = filters.pageSize ?? 20;
    const results = await this.prisma.purchaseOrder.findMany({
      where,
      take,
      skip: filters.cursor ? 1 : 0,
      ...(filters.cursor ? { cursor: { id: filters.cursor } } : {}),
      orderBy: { createdAt: "desc" },
      include: { lines: true },
    });

    const items = results.map((row) => {
      const lineItems: PurchaseOrderLineItem[] = row.lines.map((line) => ({
        id: line.id,
        description: line.description,
        quantity: line.quantity,
        unitCostCents: line.unitCostCents,
        taxCode: line.taxCode ?? undefined,
        category: line.category ?? undefined,
        sortOrder: line.sortOrder ?? undefined,
      }));

      return new PurchaseOrderAggregate({
        id: row.id,
        tenantId: row.tenantId,
        poNumber: row.poNumber ?? null,
        status: row.status as any,
        supplierPartyId: row.supplierPartyId,
        supplierContactPartyId: row.supplierContactPartyId ?? null,
        orderDate: fromPrismaDate(row.orderDate),
        expectedDeliveryDate: fromPrismaDate(row.expectedDeliveryDate),
        currency: row.currency,
        notes: row.notes ?? null,
        lineItems,
        totals: {
          subtotalCents: row.subtotalCents,
          taxCents: row.taxCents,
          totalCents: row.totalCents,
        },
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        approvedAt: row.approvedAt ?? null,
        sentAt: row.sentAt ?? null,
        receivedAt: row.receivedAt ?? null,
        closedAt: row.closedAt ?? null,
        canceledAt: row.canceledAt ?? null,
      });
    });

    const nextCursor = results.length === take ? results[results.length - 1]?.id : null;
    return { items, nextCursor };
  }

  async isPoNumberTaken(tenantId: string, poNumber: string): Promise<boolean> {
    const existing = await this.prisma.purchaseOrder.findFirst({
      where: { tenantId, poNumber },
      select: { id: true },
    });
    return Boolean(existing);
  }
}
