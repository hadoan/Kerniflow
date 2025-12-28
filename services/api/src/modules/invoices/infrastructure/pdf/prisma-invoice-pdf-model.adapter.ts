import { Injectable } from "@nestjs/common";
import { PrismaService } from "@kerniflow/data";
import { InvoicePdfModelPort } from "../../application/ports/invoice-pdf-model.port";

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
    const invoice = await this.prisma.invoice.findFirst({
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
    if ((invoice as any).billToAddressLine1) {
      addressParts.push((invoice as any).billToAddressLine1);
    }
    if ((invoice as any).billToAddressLine2) {
      addressParts.push((invoice as any).billToAddressLine2);
    }
    if ((invoice as any).billToCity) {
      addressParts.push((invoice as any).billToCity);
    }
    if ((invoice as any).billToPostalCode) {
      addressParts.push((invoice as any).billToPostalCode);
    }
    if ((invoice as any).billToCountry) {
      addressParts.push((invoice as any).billToCountry);
    }
    const billToAddress = addressParts.length > 0 ? addressParts.join(", ") : undefined;

    // Format dates
    const issueDate = invoice.issuedAt
      ? invoice.issuedAt.toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10);
    const dueDate = (invoice as any).dueDate
      ? new Date((invoice as any).dueDate).toISOString().slice(0, 10)
      : undefined;

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
      billToName: (invoice as any).billToName || "Unknown",
      billToAddress,
      issueDate,
      dueDate,
      currency: invoice.currency,
      items,
      totals: {
        subtotal: formatCurrency(subtotalCents),
        total: formatCurrency(totalCents),
      },
      notes: (invoice as any).notes || undefined,
    };
  }
}
