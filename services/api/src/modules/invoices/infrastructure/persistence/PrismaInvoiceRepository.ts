import { Injectable } from "@nestjs/common";
import { prisma } from "@kerniflow/data";
import { Invoice } from "../../domain/entities/Invoice";
import { InvoiceRepositoryPort } from "../../application/ports/InvoiceRepositoryPort";
import { InvoiceLine } from "../../domain/entities/InvoiceLine";

@Injectable()
export class PrismaInvoiceRepository implements InvoiceRepositoryPort {
  async save(invoice: Invoice): Promise<void> {
    await prisma.invoice.upsert({
      where: { id: invoice.id },
      update: {
        status: invoice.status,
        totalCents: invoice.totalCents,
        currency: invoice.currency,
        issuedAt: invoice.issuedAt,
        custom: invoice.custom as any,
      },
      create: {
        id: invoice.id,
        tenantId: invoice.tenantId,
        clientId: invoice.clientId,
        status: invoice.status,
        totalCents: invoice.totalCents,
        currency: invoice.currency,
        issuedAt: invoice.issuedAt,
        custom: invoice.custom as any,
        lines: {
          create: invoice.lines.map((line) => ({
            id: line.id,
            description: line.description,
            qty: line.qty,
            unitPriceCents: line.unitPriceCents,
          })),
        },
      },
    });

    if (invoice.lines.length) {
      for (const line of invoice.lines) {
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

  async findById(id: string): Promise<Invoice | null> {
    const data = await prisma.invoice.findUnique({
      where: { id },
      include: { lines: true },
    });
    if (!data) return null;
    const lines = data.lines.map(
      (line) => new InvoiceLine(line.id, line.description, line.qty, line.unitPriceCents)
    );
    return new Invoice(
      data.id,
      data.tenantId,
      data.status as any,
      data.totalCents,
      data.currency,
      data.clientId,
      lines,
      data.issuedAt,
      (data.custom ?? null) as any
    );
  }
}
