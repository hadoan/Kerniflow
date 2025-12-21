import { Injectable } from "@nestjs/common";
import { prisma } from "@kerniflow/data";
import {
  InvoiceRepoPort,
  ListInvoicesFilters,
  ListInvoicesResult,
} from "../../application/ports/invoice-repo.port";
import { InvoiceAggregate } from "../../domain/invoice.aggregate";
import { InvoiceLine, InvoicePayment, InvoiceStatus } from "../../domain/invoice.types";
import { LocalDate } from "@kerniflow/kernel";

const toPrismaDate = (localDate: LocalDate | null): Date | null =>
  localDate ? new Date(`${localDate}T00:00:00.000Z`) : null;

const fromPrismaDate = (value: Date | null | undefined): LocalDate | null =>
  value ? (value.toISOString().slice(0, 10) as LocalDate) : null;

@Injectable()
export class PrismaInvoiceRepoAdapter implements InvoiceRepoPort {
  async save(tenantId: string, invoice: InvoiceAggregate): Promise<void> {
    if (tenantId !== invoice.tenantId) {
      throw new Error("Tenant mismatch when saving invoice");
    }

    await prisma.invoice.upsert({
      where: { id: invoice.id },
      update: {
        customerId: invoice.customerId,
        number: invoice.number,
        status: invoice.status as any,
        currency: invoice.currency,
        notes: invoice.notes,
        terms: invoice.terms,
        invoiceDate: toPrismaDate(invoice.invoiceDate),
        dueDate: toPrismaDate(invoice.dueDate),
        issuedAt: invoice.issuedAt,
        sentAt: invoice.sentAt,
        updatedAt: invoice.updatedAt,
      },
      create: {
        id: invoice.id,
        tenantId: invoice.tenantId,
        customerId: invoice.customerId,
        number: invoice.number,
        status: invoice.status as any,
        currency: invoice.currency,
        notes: invoice.notes,
        terms: invoice.terms,
        invoiceDate: toPrismaDate(invoice.invoiceDate),
        dueDate: toPrismaDate(invoice.dueDate),
        issuedAt: invoice.issuedAt,
        sentAt: invoice.sentAt,
        createdAt: invoice.createdAt,
        updatedAt: invoice.updatedAt,
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
        await prisma.invoiceLine.upsert({
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
    const data = await prisma.invoice.findFirst({
      where: { id, tenantId },
      include: { lines: true },
    });
    if (!data) return null;
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
      customerId: (data as any).customerId ?? "",
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
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    });
  }

  async list(
    tenantId: string,
    filters: ListInvoicesFilters,
    pageSize = 20,
    cursor?: string
  ): Promise<ListInvoicesResult> {
    const where: any = { tenantId };
    if (filters.status) where.status = filters.status;
    if (filters.customerId) where.customerId = filters.customerId;
    if (filters.fromDate || filters.toDate) {
      where.createdAt = {};
      if (filters.fromDate) where.createdAt.gte = filters.fromDate;
      if (filters.toDate) where.createdAt.lte = filters.toDate;
    }

    const results = await prisma.invoice.findMany({
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
        customerId: (row as any).customerId ?? "",
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
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      });
    });

    const nextCursor = items.length === pageSize ? items[items.length - 1].id : null;
    return { items, nextCursor };
  }

  async isInvoiceNumberTaken(tenantId: string, number: string): Promise<boolean> {
    const count = await prisma.invoice.count({ where: { tenantId, number } });
    return count > 0;
  }
}
