import { Injectable } from "@nestjs/common";
import { PrismaService } from "@corely/data";
import {
  InvoiceRepoPort,
  ListInvoicesFilters,
  ListInvoicesResult,
} from "../../application/ports/invoice-repository.port";
import { InvoiceAggregate } from "../../domain/invoice.aggregate";
import { InvoiceLine, InvoicePayment, InvoiceStatus, PdfStatus } from "../../domain/invoice.types";
import { LocalDate } from "@corely/kernel";

const toPrismaDate = (localDate: LocalDate | null): Date | null =>
  localDate ? new Date(`${localDate}T00:00:00.000Z`) : null;

const fromPrismaDate = (value: Date | null | undefined): LocalDate | null =>
  value ? (value.toISOString().slice(0, 10) as LocalDate) : null;

@Injectable()
export class PrismaInvoiceRepoAdapter implements InvoiceRepoPort {
  constructor(private readonly prisma: PrismaService) {}

  async save(tenantId: string, invoice: InvoiceAggregate): Promise<void> {
    if (tenantId !== invoice.tenantId) {
      throw new Error("Tenant mismatch when saving invoice");
    }

    await this.prisma.invoice.upsert({
      where: { id: invoice.id },
      update: {
        customerPartyId: invoice.customerPartyId,
        number: invoice.number,
        status: invoice.status as any,
        currency: invoice.currency,
        notes: invoice.notes,
        terms: invoice.terms,
        invoiceDate: toPrismaDate(invoice.invoiceDate),
        dueDate: toPrismaDate(invoice.dueDate),
        issuedAt: invoice.issuedAt,
        sentAt: invoice.sentAt,
        billToName: invoice.billToName,
        billToEmail: invoice.billToEmail,
        billToVatId: invoice.billToVatId,
        billToAddressLine1: invoice.billToAddressLine1,
        billToAddressLine2: invoice.billToAddressLine2,
        billToCity: invoice.billToCity,
        billToPostalCode: invoice.billToPostalCode,
        billToCountry: invoice.billToCountry,
        updatedAt: invoice.updatedAt,
        pdfStorageKey: invoice.pdfStorageKey,
        pdfGeneratedAt: invoice.pdfGeneratedAt,
        pdfSourceVersion: invoice.pdfSourceVersion,
        pdfStatus: invoice.pdfStatus as any,
        pdfFailureReason: invoice.pdfFailureReason,
      },
      create: {
        id: invoice.id,
        tenantId: invoice.tenantId,
        customerPartyId: invoice.customerPartyId,
        number: invoice.number,
        status: invoice.status as any,
        currency: invoice.currency,
        notes: invoice.notes,
        terms: invoice.terms,
        invoiceDate: toPrismaDate(invoice.invoiceDate),
        dueDate: toPrismaDate(invoice.dueDate),
        issuedAt: invoice.issuedAt,
        sentAt: invoice.sentAt,
        billToName: invoice.billToName,
        billToEmail: invoice.billToEmail,
        billToVatId: invoice.billToVatId,
        billToAddressLine1: invoice.billToAddressLine1,
        billToAddressLine2: invoice.billToAddressLine2,
        billToCity: invoice.billToCity,
        billToPostalCode: invoice.billToPostalCode,
        billToCountry: invoice.billToCountry,
        createdAt: invoice.createdAt,
        updatedAt: invoice.updatedAt,
        pdfStorageKey: invoice.pdfStorageKey,
        pdfGeneratedAt: invoice.pdfGeneratedAt,
        pdfSourceVersion: invoice.pdfSourceVersion,
        pdfStatus: invoice.pdfStatus as any,
        pdfFailureReason: invoice.pdfFailureReason,
        lines: {
          create: invoice.lineItems.map((line) => ({
            id: line.id,
            description: line.description,
            qty: line.qty,
            unitPriceCents: line.unitPriceCents,
          })),
        },
      },
    });

    if (invoice.lineItems.length) {
      for (const line of invoice.lineItems) {
        await this.prisma.invoiceLine.upsert({
          where: { id: line.id },
          update: {
            description: line.description,
            qty: line.qty,
            unitPriceCents: line.unitPriceCents,
          },
          create: {
            id: line.id,
            invoiceId: invoice.id,
            description: line.description,
            qty: line.qty,
            unitPriceCents: line.unitPriceCents,
          },
        });
      }
    }
  }

  async create(tenantId: string, invoice: InvoiceAggregate): Promise<void> {
    await this.save(tenantId, invoice);
  }

  async findById(tenantId: string, id: string): Promise<InvoiceAggregate | null> {
    const data = await this.prisma.invoice.findFirst({
      where: { id, tenantId },
      include: { lines: true },
    });
    if (!data) {
      return null;
    }
    const lineItems: InvoiceLine[] = data.lines.map((line) => ({
      id: line.id,
      description: line.description,
      qty: line.qty,
      unitPriceCents: line.unitPriceCents,
    }));
    const payments: InvoicePayment[] = []; // payments not modeled in prisma yet
    return new InvoiceAggregate({
      id: data.id,
      tenantId: data.tenantId,
      customerPartyId: (data as any).customerPartyId ?? "",
      currency: data.currency,
      notes: (data as any).notes ?? null,
      terms: (data as any).terms ?? null,
      number: (data as any).number ?? null,
      status: data.status as any,
      lineItems,
      payments,
      issuedAt: data.issuedAt,
      invoiceDate: fromPrismaDate((data as any).invoiceDate ?? null),
      dueDate: fromPrismaDate((data as any).dueDate ?? null),
      sentAt: (data as any).sentAt ?? null,
      billToName: (data as any).billToName ?? null,
      billToEmail: (data as any).billToEmail ?? null,
      billToVatId: (data as any).billToVatId ?? null,
      billToAddressLine1: (data as any).billToAddressLine1 ?? null,
      billToAddressLine2: (data as any).billToAddressLine2 ?? null,
      billToCity: (data as any).billToCity ?? null,
      billToPostalCode: (data as any).billToPostalCode ?? null,
      billToCountry: (data as any).billToCountry ?? null,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      pdfStorageKey: (data as any).pdfStorageKey ?? null,
      pdfGeneratedAt: (data as any).pdfGeneratedAt ?? null,
      pdfSourceVersion: (data as any).pdfSourceVersion ?? null,
      pdfStatus: ((data as any).pdfStatus as PdfStatus) ?? "NONE",
      pdfFailureReason: (data as any).pdfFailureReason ?? null,
    });
  }

  async list(
    tenantId: string,
    filters: ListInvoicesFilters,
    pageSize = 20,
    cursor?: string
  ): Promise<ListInvoicesResult> {
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

    const results = await this.prisma.invoice.findMany({
      where,
      take: pageSize,
      skip: cursor ? 1 : 0,
      ...(cursor ? { cursor: { id: cursor } } : {}),
      orderBy: { createdAt: "desc" },
      include: { lines: true },
    });

    const items = results.map((row) => {
      const lines: InvoiceLine[] = row.lines.map((line) => ({
        id: line.id,
        description: line.description,
        qty: line.qty,
        unitPriceCents: line.unitPriceCents,
      }));
      return new InvoiceAggregate({
        id: row.id,
        tenantId: row.tenantId,
        customerPartyId: (row as any).customerPartyId ?? "",
        currency: row.currency,
        notes: (row as any).notes ?? null,
        terms: (row as any).terms ?? null,
        number: (row as any).number ?? null,
        status: row.status as any,
        lineItems: lines,
        payments: [],
        issuedAt: row.issuedAt,
        invoiceDate: fromPrismaDate((row as any).invoiceDate ?? null),
        dueDate: fromPrismaDate((row as any).dueDate ?? null),
        sentAt: (row as any).sentAt ?? null,
        billToName: (row as any).billToName ?? null,
        billToEmail: (row as any).billToEmail ?? null,
        billToVatId: (row as any).billToVatId ?? null,
        billToAddressLine1: (row as any).billToAddressLine1 ?? null,
        billToAddressLine2: (row as any).billToAddressLine2 ?? null,
        billToCity: (row as any).billToCity ?? null,
        billToPostalCode: (row as any).billToPostalCode ?? null,
        billToCountry: (row as any).billToCountry ?? null,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        pdfStorageKey: (row as any).pdfStorageKey ?? null,
        pdfGeneratedAt: (row as any).pdfGeneratedAt ?? null,
        pdfSourceVersion: (row as any).pdfSourceVersion ?? null,
        pdfStatus: ((row as any).pdfStatus as PdfStatus) ?? "NONE",
        pdfFailureReason: (row as any).pdfFailureReason ?? null,
      });
    });

    const nextCursor = items.length === pageSize ? items[items.length - 1].id : null;
    return { items, nextCursor };
  }

  async isInvoiceNumberTaken(tenantId: string, number: string): Promise<boolean> {
    const count = await this.prisma.invoice.count({ where: { tenantId, number } });
    return count > 0;
  }
}
