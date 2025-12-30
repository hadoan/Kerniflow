import { Injectable } from "@nestjs/common";
import { PrismaService } from "@corely/data";
import {
  InvoiceEmailContextQueryPort,
  InvoiceEmailContext,
} from "../../application/ports/invoice-email-context-query.port";

@Injectable()
export class PrismaInvoiceEmailContextQueryAdapter implements InvoiceEmailContextQueryPort {
  constructor(private readonly prisma: PrismaService) {}

  async getInvoiceEmailContext(
    tenantId: string,
    invoiceId: string
  ): Promise<InvoiceEmailContext | null> {
    const invoice = await this.prisma.invoice.findFirst({
      where: {
        id: invoiceId,
        tenantId,
      },
      include: {
        lines: true,
      },
    });

    if (!invoice) {
      return null;
    }

    // Calculate total from lines
    const totalAmountCents = invoice.lines.reduce(
      (sum, line) => sum + line.qty * line.unitPriceCents,
      0
    );

    // For now, we'll use placeholder values for customer info and URLs
    // These should be fetched from a Customer entity/table in a real implementation
    return {
      invoiceNumber: invoice.number ?? "DRAFT",
      customerName: "Customer", // TODO: Fetch from Customer table
      customerEmail: "customer@example.com", // TODO: Fetch from Customer table
      totalAmountCents,
      currency: invoice.currency,
      invoiceDate: invoice.invoiceDate?.toISOString().slice(0, 10) ?? null,
      dueDate: invoice.dueDate?.toISOString().slice(0, 10) ?? null,
      publicInvoiceUrl: undefined, // TODO: Generate public invoice URL
      pdfUrl: undefined, // TODO: Generate PDF URL
      companyName: "Your Company", // TODO: Fetch from Tenant/Company settings
    };
  }
}
