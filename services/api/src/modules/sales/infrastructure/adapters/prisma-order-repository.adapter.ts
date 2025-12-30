import { Injectable } from "@nestjs/common";
import { PrismaService } from "@corely/data";
import type {
  SalesOrderRepositoryPort,
  ListOrdersFilters,
  ListOrdersResult,
} from "../../application/ports/order-repository.port";
import { SalesOrderAggregate } from "../../domain/order.aggregate";
import type { OrderLineItem, OrderStatus } from "../../domain/sales.types";
import { toPrismaDate, fromPrismaDate } from "./date-mappers";

@Injectable()
export class PrismaSalesOrderRepositoryAdapter implements SalesOrderRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async save(tenantId: string, order: SalesOrderAggregate): Promise<void> {
    if (tenantId !== order.tenantId) {
      throw new Error("Tenant mismatch when saving sales order");
    }

    await this.prisma.salesOrder.upsert({
      where: { id: order.id },
      update: {
        number: order.number,
        status: order.status as any,
        customerPartyId: order.customerPartyId,
        customerContactPartyId: order.customerContactPartyId,
        orderDate: toPrismaDate(order.orderDate),
        deliveryDate: toPrismaDate(order.deliveryDate),
        currency: order.currency,
        notes: order.notes,
        subtotalCents: order.totals.subtotalCents,
        discountCents: order.totals.discountCents,
        taxCents: order.totals.taxCents,
        totalCents: order.totals.totalCents,
        confirmedAt: order.confirmedAt,
        fulfilledAt: order.fulfilledAt,
        canceledAt: order.canceledAt,
        sourceQuoteId: order.sourceQuoteId,
        sourceInvoiceId: order.sourceInvoiceId,
        updatedAt: order.updatedAt,
      },
      create: {
        id: order.id,
        tenantId: order.tenantId,
        number: order.number,
        status: order.status as any,
        customerPartyId: order.customerPartyId,
        customerContactPartyId: order.customerContactPartyId,
        orderDate: toPrismaDate(order.orderDate),
        deliveryDate: toPrismaDate(order.deliveryDate),
        currency: order.currency,
        notes: order.notes,
        subtotalCents: order.totals.subtotalCents,
        discountCents: order.totals.discountCents,
        taxCents: order.totals.taxCents,
        totalCents: order.totals.totalCents,
        confirmedAt: order.confirmedAt,
        fulfilledAt: order.fulfilledAt,
        canceledAt: order.canceledAt,
        sourceQuoteId: order.sourceQuoteId,
        sourceInvoiceId: order.sourceInvoiceId,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        lines: {
          create: order.lineItems.map((line) => ({
            id: line.id,
            description: line.description,
            quantity: line.quantity,
            unitPriceCents: line.unitPriceCents,
            discountCents: line.discountCents,
            taxCode: line.taxCode,
            revenueCategory: line.revenueCategory,
            sortOrder: line.sortOrder,
          })),
        },
      },
    });

    const lineIds = order.lineItems.map((line) => line.id);
    await this.prisma.salesOrderLine.deleteMany({
      where: {
        orderId: order.id,
        id: { notIn: lineIds },
      },
    });

    for (const line of order.lineItems) {
      await this.prisma.salesOrderLine.upsert({
        where: { id: line.id },
        update: {
          description: line.description,
          quantity: line.quantity,
          unitPriceCents: line.unitPriceCents,
          discountCents: line.discountCents,
          taxCode: line.taxCode,
          revenueCategory: line.revenueCategory,
          sortOrder: line.sortOrder,
        },
        create: {
          id: line.id,
          orderId: order.id,
          description: line.description,
          quantity: line.quantity,
          unitPriceCents: line.unitPriceCents,
          discountCents: line.discountCents,
          taxCode: line.taxCode,
          revenueCategory: line.revenueCategory,
          sortOrder: line.sortOrder,
        },
      });
    }
  }

  async create(tenantId: string, order: SalesOrderAggregate): Promise<void> {
    await this.save(tenantId, order);
  }

  async findById(tenantId: string, orderId: string): Promise<SalesOrderAggregate | null> {
    const data = await this.prisma.salesOrder.findFirst({
      where: { id: orderId, tenantId },
      include: { lines: true },
    });
    if (!data) {
      return null;
    }

    const lineItems: OrderLineItem[] = data.lines.map((line) => ({
      id: line.id,
      description: line.description,
      quantity: line.quantity,
      unitPriceCents: line.unitPriceCents,
      discountCents: line.discountCents ?? undefined,
      taxCode: line.taxCode ?? undefined,
      revenueCategory: line.revenueCategory ?? undefined,
      sortOrder: line.sortOrder ?? undefined,
    }));

    return new SalesOrderAggregate({
      id: data.id,
      tenantId: data.tenantId,
      number: data.number ?? null,
      status: data.status as OrderStatus,
      customerPartyId: data.customerPartyId,
      customerContactPartyId: data.customerContactPartyId ?? null,
      orderDate: fromPrismaDate(data.orderDate),
      deliveryDate: fromPrismaDate(data.deliveryDate),
      currency: data.currency,
      notes: data.notes ?? null,
      lineItems,
      totals: {
        subtotalCents: data.subtotalCents,
        discountCents: data.discountCents,
        taxCents: data.taxCents,
        totalCents: data.totalCents,
      },
      confirmedAt: data.confirmedAt,
      fulfilledAt: data.fulfilledAt,
      canceledAt: data.canceledAt,
      sourceQuoteId: data.sourceQuoteId ?? null,
      sourceInvoiceId: data.sourceInvoiceId ?? null,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    });
  }

  async list(
    tenantId: string,
    filters: ListOrdersFilters,
    pageSize = 20,
    cursor?: string
  ): Promise<ListOrdersResult> {
    const where: any = { tenantId };
    if (filters.status) {
      where.status = filters.status;
    }
    if (filters.customerPartyId) {
      where.customerPartyId = filters.customerPartyId;
    }
    if (filters.fromDate || filters.toDate) {
      where.createdAt = {};
      if (filters.fromDate) {
        where.createdAt.gte = filters.fromDate;
      }
      if (filters.toDate) {
        where.createdAt.lte = filters.toDate;
      }
    }

    const results = await this.prisma.salesOrder.findMany({
      where,
      take: pageSize,
      skip: cursor ? 1 : 0,
      ...(cursor ? { cursor: { id: cursor } } : {}),
      orderBy: { createdAt: "desc" },
      include: { lines: true },
    });

    const items = results.map((row) => {
      const lineItems: OrderLineItem[] = row.lines.map((line) => ({
        id: line.id,
        description: line.description,
        quantity: line.quantity,
        unitPriceCents: line.unitPriceCents,
        discountCents: line.discountCents ?? undefined,
        taxCode: line.taxCode ?? undefined,
        revenueCategory: line.revenueCategory ?? undefined,
        sortOrder: line.sortOrder ?? undefined,
      }));

      return new SalesOrderAggregate({
        id: row.id,
        tenantId: row.tenantId,
        number: row.number ?? null,
        status: row.status as OrderStatus,
        customerPartyId: row.customerPartyId,
        customerContactPartyId: row.customerContactPartyId ?? null,
        orderDate: fromPrismaDate(row.orderDate),
        deliveryDate: fromPrismaDate(row.deliveryDate),
        currency: row.currency,
        notes: row.notes ?? null,
        lineItems,
        totals: {
          subtotalCents: row.subtotalCents,
          discountCents: row.discountCents,
          taxCents: row.taxCents,
          totalCents: row.totalCents,
        },
        confirmedAt: row.confirmedAt,
        fulfilledAt: row.fulfilledAt,
        canceledAt: row.canceledAt,
        sourceQuoteId: row.sourceQuoteId ?? null,
        sourceInvoiceId: row.sourceInvoiceId ?? null,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      });
    });

    const nextCursor = results.length === pageSize ? results[results.length - 1]?.id : null;
    return { items, nextCursor };
  }

  async isOrderNumberTaken(tenantId: string, number: string): Promise<boolean> {
    const existing = await this.prisma.salesOrder.findFirst({
      where: { tenantId, number },
      select: { id: true },
    });
    return Boolean(existing);
  }
}
