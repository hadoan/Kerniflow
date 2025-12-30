import { Injectable } from "@nestjs/common";
import { PrismaService } from "@corely/data";
import type {
  SalesInvoiceRepositoryPort,
  ListSalesInvoicesFilters,
  ListSalesInvoicesResult,
} from "../../application/ports/invoice-repository.port";
import { SalesInvoiceAggregate } from "../../domain/invoice.aggregate";
import type { InvoiceLineItem, SalesInvoiceStatus, SalesPayment } from "../../domain/sales.types";
import { toPrismaDate, fromPrismaDate } from "./date-mappers";

@Injectable()
export class PrismaSalesInvoiceRepositoryAdapter implements SalesInvoiceRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async save(tenantId: string, invoice: SalesInvoiceAggregate): Promise<void> {
    if (tenantId !== invoice.tenantId) {
      throw new Error("Tenant mismatch when saving sales invoice");
    }

    await this.prisma.salesInvoice.upsert({
      where: { id: invoice.id },
      update: {
        number: invoice.number,
        status: invoice.status as any,
        customerPartyId: invoice.customerPartyId,
        customerContactPartyId: invoice.customerContactPartyId,
        issueDate: toPrismaDate(invoice.issueDate),
        dueDate: toPrismaDate(invoice.dueDate),
        currency: invoice.currency,
        paymentTerms: invoice.paymentTerms,
        notes: invoice.notes,
        subtotalCents: invoice.totals.subtotalCents,
        discountCents: invoice.totals.discountCents,
        taxCents: invoice.totals.taxCents,
        totalCents: invoice.totals.totalCents,
        paidCents: invoice.totals.paidCents,
        dueCents: invoice.totals.dueCents,
        issuedAt: invoice.issuedAt,
        voidedAt: invoice.voidedAt,
        voidReason: invoice.voidReason,
        sourceSalesOrderId: invoice.sourceSalesOrderId,
        sourceQuoteId: invoice.sourceQuoteId,
        issuedJournalEntryId: invoice.issuedJournalEntryId,
        updatedAt: invoice.updatedAt,
      },
      create: {
        id: invoice.id,
        tenantId: invoice.tenantId,
        number: invoice.number,
        status: invoice.status as any,
        customerPartyId: invoice.customerPartyId,
        customerContactPartyId: invoice.customerContactPartyId,
        issueDate: toPrismaDate(invoice.issueDate),
        dueDate: toPrismaDate(invoice.dueDate),
        currency: invoice.currency,
        paymentTerms: invoice.paymentTerms,
        notes: invoice.notes,
        subtotalCents: invoice.totals.subtotalCents,
        discountCents: invoice.totals.discountCents,
        taxCents: invoice.totals.taxCents,
        totalCents: invoice.totals.totalCents,
        paidCents: invoice.totals.paidCents,
        dueCents: invoice.totals.dueCents,
        issuedAt: invoice.issuedAt,
        voidedAt: invoice.voidedAt,
        voidReason: invoice.voidReason,
        sourceSalesOrderId: invoice.sourceSalesOrderId,
        sourceQuoteId: invoice.sourceQuoteId,
        issuedJournalEntryId: invoice.issuedJournalEntryId,
        createdAt: invoice.createdAt,
        updatedAt: invoice.updatedAt,
        lines: {
          create: invoice.lineItems.map((line) => ({
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

    const lineIds = invoice.lineItems.map((line) => line.id);
    await this.prisma.salesInvoiceLine.deleteMany({
      where: {
        invoiceId: invoice.id,
        id: { notIn: lineIds },
      },
    });

    for (const line of invoice.lineItems) {
      await this.prisma.salesInvoiceLine.upsert({
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
          invoiceId: invoice.id,
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

  async create(tenantId: string, invoice: SalesInvoiceAggregate): Promise<void> {
    await this.save(tenantId, invoice);
  }

  async findById(tenantId: string, invoiceId: string): Promise<SalesInvoiceAggregate | null> {
    const data = await this.prisma.salesInvoice.findFirst({
      where: { id: invoiceId, tenantId },
      include: { lines: true, payments: true },
    });
    if (!data) {
      return null;
    }

    const lineItems: InvoiceLineItem[] = data.lines.map((line) => ({
      id: line.id,
      description: line.description,
      quantity: line.quantity,
      unitPriceCents: line.unitPriceCents,
      discountCents: line.discountCents ?? undefined,
      taxCode: line.taxCode ?? undefined,
      revenueCategory: line.revenueCategory ?? undefined,
      sortOrder: line.sortOrder ?? undefined,
    }));

    const payments: SalesPayment[] = data.payments.map((payment) => ({
      id: payment.id,
      invoiceId: payment.invoiceId,
      amountCents: payment.amountCents,
      currency: payment.currency,
      paymentDate: fromPrismaDate(payment.paymentDate)!,
      method: payment.method as any,
      reference: payment.reference ?? null,
      notes: payment.notes ?? null,
      recordedAt: payment.recordedAt,
      recordedByUserId: payment.recordedByUserId ?? null,
      journalEntryId: payment.journalEntryId ?? null,
    }));

    return new SalesInvoiceAggregate({
      id: data.id,
      tenantId: data.tenantId,
      number: data.number ?? null,
      status: data.status as SalesInvoiceStatus,
      customerPartyId: data.customerPartyId,
      customerContactPartyId: data.customerContactPartyId ?? null,
      issueDate: fromPrismaDate(data.issueDate),
      dueDate: fromPrismaDate(data.dueDate),
      currency: data.currency,
      paymentTerms: data.paymentTerms ?? null,
      notes: data.notes ?? null,
      lineItems,
      totals: {
        subtotalCents: data.subtotalCents,
        discountCents: data.discountCents,
        taxCents: data.taxCents,
        totalCents: data.totalCents,
        paidCents: data.paidCents,
        dueCents: data.dueCents,
      },
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      issuedAt: data.issuedAt,
      voidedAt: data.voidedAt,
      voidReason: data.voidReason ?? null,
      sourceSalesOrderId: data.sourceSalesOrderId ?? null,
      sourceQuoteId: data.sourceQuoteId ?? null,
      issuedJournalEntryId: data.issuedJournalEntryId ?? null,
      payments,
    });
  }

  async list(
    tenantId: string,
    filters: ListSalesInvoicesFilters,
    pageSize = 20,
    cursor?: string
  ): Promise<ListSalesInvoicesResult> {
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

    const results = await this.prisma.salesInvoice.findMany({
      where,
      take: pageSize,
      skip: cursor ? 1 : 0,
      ...(cursor ? { cursor: { id: cursor } } : {}),
      orderBy: { createdAt: "desc" },
      include: { lines: true, payments: true },
    });

    const items = results.map((row) => {
      const lineItems: InvoiceLineItem[] = row.lines.map((line) => ({
        id: line.id,
        description: line.description,
        quantity: line.quantity,
        unitPriceCents: line.unitPriceCents,
        discountCents: line.discountCents ?? undefined,
        taxCode: line.taxCode ?? undefined,
        revenueCategory: line.revenueCategory ?? undefined,
        sortOrder: line.sortOrder ?? undefined,
      }));

      const payments: SalesPayment[] = row.payments.map((payment) => ({
        id: payment.id,
        invoiceId: payment.invoiceId,
        amountCents: payment.amountCents,
        currency: payment.currency,
        paymentDate: fromPrismaDate(payment.paymentDate)!,
        method: payment.method as any,
        reference: payment.reference ?? null,
        notes: payment.notes ?? null,
        recordedAt: payment.recordedAt,
        recordedByUserId: payment.recordedByUserId ?? null,
        journalEntryId: payment.journalEntryId ?? null,
      }));

      return new SalesInvoiceAggregate({
        id: row.id,
        tenantId: row.tenantId,
        number: row.number ?? null,
        status: row.status as SalesInvoiceStatus,
        customerPartyId: row.customerPartyId,
        customerContactPartyId: row.customerContactPartyId ?? null,
        issueDate: fromPrismaDate(row.issueDate),
        dueDate: fromPrismaDate(row.dueDate),
        currency: row.currency,
        paymentTerms: row.paymentTerms ?? null,
        notes: row.notes ?? null,
        lineItems,
        totals: {
          subtotalCents: row.subtotalCents,
          discountCents: row.discountCents,
          taxCents: row.taxCents,
          totalCents: row.totalCents,
          paidCents: row.paidCents,
          dueCents: row.dueCents,
        },
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        issuedAt: row.issuedAt,
        voidedAt: row.voidedAt,
        voidReason: row.voidReason ?? null,
        sourceSalesOrderId: row.sourceSalesOrderId ?? null,
        sourceQuoteId: row.sourceQuoteId ?? null,
        issuedJournalEntryId: row.issuedJournalEntryId ?? null,
        payments,
      });
    });

    const nextCursor = results.length === pageSize ? results[results.length - 1]?.id : null;
    return { items, nextCursor };
  }

  async isInvoiceNumberTaken(tenantId: string, number: string): Promise<boolean> {
    const existing = await this.prisma.salesInvoice.findFirst({
      where: { tenantId, number },
      select: { id: true },
    });
    return Boolean(existing);
  }
}
