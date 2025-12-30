import { Injectable } from "@nestjs/common";
import { PrismaService } from "@corely/data";
import { InvoicePdfModelPort } from "../../application/ports/invoice-pdf-model.port";
import type { Prisma } from "@prisma/client";

type InvoiceWithLines = Prisma.InvoiceGetPayload<{
  include: { lines: true };
}>;

@Injectable()
export class PrismaInvoicePdfModelAdapter implements InvoicePdfModelPort {
  constructor(private readonly prisma: PrismaService) {}

  async getInvoicePdfModel(
    tenantId: string,
    invoiceId: string
  ): Promise<{
    invoiceNumber: string;
    billToName: string;
    billToAddress?: string;
    issueDate: string;
    dueDate?: string;
    currency: string;
    items: Array<{ description: string; qty: string; unitPrice: string; lineTotal: string }>;
    totals: { subtotal: string; total: string };
    notes?: string;
  } | null> {
    const invoice: InvoiceWithLines | null = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, tenantId },
      include: { lines: true },
    });

    if (!invoice) {
      return null;
    }

    if (!invoice.number) {
      return null;
    }

    // Build bill-to address
    const addressParts: string[] = [];
    if (invoice.billToAddressLine1) {
      addressParts.push(invoice.billToAddressLine1);
    }
    if (invoice.billToAddressLine2) {
      addressParts.push(invoice.billToAddressLine2);
    }
    if (invoice.billToCity) {
      addressParts.push(invoice.billToCity);
    }
    if (invoice.billToPostalCode) {
      addressParts.push(invoice.billToPostalCode);
    }
    if (invoice.billToCountry) {
      addressParts.push(invoice.billToCountry);
    }
    const billToAddress = addressParts.length > 0 ? addressParts.join(", ") : undefined;

    // Format dates
    const issueDate = invoice.issuedAt
      ? invoice.issuedAt.toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10);
    const dueDate = invoice.dueDate ? invoice.dueDate.toISOString().slice(0, 10) : undefined;

    // Calculate totals
    const subtotalCents = invoice.lines.reduce(
      (sum, line) => sum + line.qty * line.unitPriceCents,
      0
    );
    const totalCents = subtotalCents;

    // Format currency helper
    const formatCurrency = (cents: number): string => {
      const amount = (cents / 100).toFixed(2);
      return `${invoice.currency} ${amount}`;
    };

    // Map line items
    const items = invoice.lines.map((line) => ({
      description: line.description,
      qty: String(line.qty),
      unitPrice: formatCurrency(line.unitPriceCents),
      lineTotal: formatCurrency(line.qty * line.unitPriceCents),
    }));

    return {
      invoiceNumber: invoice.number,
      billToName: invoice.billToName || "Unknown",
      billToAddress,
      issueDate,
      dueDate,
      currency: invoice.currency,
      items,
      totals: {
        subtotal: formatCurrency(subtotalCents),
        total: formatCurrency(totalCents),
      },
      notes: invoice.notes || undefined,
    };
  }
}
