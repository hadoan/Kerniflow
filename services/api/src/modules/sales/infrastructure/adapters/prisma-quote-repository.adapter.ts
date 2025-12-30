import { Injectable } from "@nestjs/common";
import { PrismaService } from "@corely/data";
import type {
  QuoteRepositoryPort,
  ListQuotesFilters,
  ListQuotesResult,
} from "../../application/ports/quote-repository.port";
import { QuoteAggregate } from "../../domain/quote.aggregate";
import type { QuoteLineItem, QuoteStatus } from "../../domain/sales.types";
import { toPrismaDate, fromPrismaDate } from "./date-mappers";

@Injectable()
export class PrismaQuoteRepositoryAdapter implements QuoteRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async save(tenantId: string, quote: QuoteAggregate): Promise<void> {
    if (tenantId !== quote.tenantId) {
      throw new Error("Tenant mismatch when saving quote");
    }

    await this.prisma.salesQuote.upsert({
      where: { id: quote.id },
      update: {
        number: quote.number,
        status: quote.status as any,
        customerPartyId: quote.customerPartyId,
        customerContactPartyId: quote.customerContactPartyId,
        issueDate: toPrismaDate(quote.issueDate),
        validUntilDate: toPrismaDate(quote.validUntilDate),
        currency: quote.currency,
        paymentTerms: quote.paymentTerms,
        notes: quote.notes,
        subtotalCents: quote.totals.subtotalCents,
        discountCents: quote.totals.discountCents,
        taxCents: quote.totals.taxCents,
        totalCents: quote.totals.totalCents,
        sentAt: quote.sentAt,
        acceptedAt: quote.acceptedAt,
        rejectedAt: quote.rejectedAt,
        convertedToSalesOrderId: quote.convertedToSalesOrderId,
        convertedToInvoiceId: quote.convertedToInvoiceId,
        updatedAt: quote.updatedAt,
      },
      create: {
        id: quote.id,
        tenantId: quote.tenantId,
        number: quote.number,
        status: quote.status as any,
        customerPartyId: quote.customerPartyId,
        customerContactPartyId: quote.customerContactPartyId,
        issueDate: toPrismaDate(quote.issueDate),
        validUntilDate: toPrismaDate(quote.validUntilDate),
        currency: quote.currency,
        paymentTerms: quote.paymentTerms,
        notes: quote.notes,
        subtotalCents: quote.totals.subtotalCents,
        discountCents: quote.totals.discountCents,
        taxCents: quote.totals.taxCents,
        totalCents: quote.totals.totalCents,
        sentAt: quote.sentAt,
        acceptedAt: quote.acceptedAt,
        rejectedAt: quote.rejectedAt,
        convertedToSalesOrderId: quote.convertedToSalesOrderId,
        convertedToInvoiceId: quote.convertedToInvoiceId,
        createdAt: quote.createdAt,
        updatedAt: quote.updatedAt,
        lines: {
          create: quote.lineItems.map((line) => ({
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

    const lineIds = quote.lineItems.map((line) => line.id);
    await this.prisma.salesQuoteLine.deleteMany({
      where: {
        quoteId: quote.id,
        id: { notIn: lineIds },
      },
    });

    for (const line of quote.lineItems) {
      await this.prisma.salesQuoteLine.upsert({
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
          quoteId: quote.id,
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

  async create(tenantId: string, quote: QuoteAggregate): Promise<void> {
    await this.save(tenantId, quote);
  }

  async findById(tenantId: string, quoteId: string): Promise<QuoteAggregate | null> {
    const data = await this.prisma.salesQuote.findFirst({
      where: { id: quoteId, tenantId },
      include: { lines: true },
    });
    if (!data) {
      return null;
    }
    const lineItems: QuoteLineItem[] = data.lines.map((line) => ({
      id: line.id,
      description: line.description,
      quantity: line.quantity,
      unitPriceCents: line.unitPriceCents,
      discountCents: line.discountCents ?? undefined,
      taxCode: line.taxCode ?? undefined,
      revenueCategory: line.revenueCategory ?? undefined,
      sortOrder: line.sortOrder ?? undefined,
    }));

    return new QuoteAggregate({
      id: data.id,
      tenantId: data.tenantId,
      number: data.number ?? null,
      status: data.status as QuoteStatus,
      customerPartyId: data.customerPartyId,
      customerContactPartyId: data.customerContactPartyId ?? null,
      issueDate: fromPrismaDate(data.issueDate),
      validUntilDate: fromPrismaDate(data.validUntilDate),
      currency: data.currency,
      paymentTerms: data.paymentTerms ?? null,
      notes: data.notes ?? null,
      lineItems,
      totals: {
        subtotalCents: data.subtotalCents,
        discountCents: data.discountCents,
        taxCents: data.taxCents,
        totalCents: data.totalCents,
      },
      sentAt: data.sentAt,
      acceptedAt: data.acceptedAt,
      rejectedAt: data.rejectedAt,
      convertedToSalesOrderId: data.convertedToSalesOrderId ?? null,
      convertedToInvoiceId: data.convertedToInvoiceId ?? null,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    });
  }

  async list(
    tenantId: string,
    filters: ListQuotesFilters,
    pageSize = 20,
    cursor?: string
  ): Promise<ListQuotesResult> {
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

    const results = await this.prisma.salesQuote.findMany({
      where,
      take: pageSize,
      skip: cursor ? 1 : 0,
      ...(cursor ? { cursor: { id: cursor } } : {}),
      orderBy: { createdAt: "desc" },
      include: { lines: true },
    });

    const items = results.map((row) => {
      const lineItems: QuoteLineItem[] = row.lines.map((line) => ({
        id: line.id,
        description: line.description,
        quantity: line.quantity,
        unitPriceCents: line.unitPriceCents,
        discountCents: line.discountCents ?? undefined,
        taxCode: line.taxCode ?? undefined,
        revenueCategory: line.revenueCategory ?? undefined,
        sortOrder: line.sortOrder ?? undefined,
      }));

      return new QuoteAggregate({
        id: row.id,
        tenantId: row.tenantId,
        number: row.number ?? null,
        status: row.status as QuoteStatus,
        customerPartyId: row.customerPartyId,
        customerContactPartyId: row.customerContactPartyId ?? null,
        issueDate: fromPrismaDate(row.issueDate),
        validUntilDate: fromPrismaDate(row.validUntilDate),
        currency: row.currency,
        paymentTerms: row.paymentTerms ?? null,
        notes: row.notes ?? null,
        lineItems,
        totals: {
          subtotalCents: row.subtotalCents,
          discountCents: row.discountCents,
          taxCents: row.taxCents,
          totalCents: row.totalCents,
        },
        sentAt: row.sentAt,
        acceptedAt: row.acceptedAt,
        rejectedAt: row.rejectedAt,
        convertedToSalesOrderId: row.convertedToSalesOrderId ?? null,
        convertedToInvoiceId: row.convertedToInvoiceId ?? null,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      });
    });

    const nextCursor = results.length === pageSize ? results[results.length - 1]?.id : null;
    return { items, nextCursor };
  }

  async isQuoteNumberTaken(tenantId: string, number: string): Promise<boolean> {
    const existing = await this.prisma.salesQuote.findFirst({
      where: { tenantId, number },
      select: { id: true },
    });
    return Boolean(existing);
  }
}
