import { type InvoicePdfModelPort } from "../../../invoices/application/ports/invoice-pdf-model.port";

export class FakeInvoicePdfModelPort implements InvoicePdfModelPort {
  model: {
    invoiceNumber: string;
    billToName: string;
    billToAddress?: string;
    issueDate: string;
    dueDate?: string;
    currency: string;
    items: Array<{ description: string; qty: string; unitPrice: string; lineTotal: string }>;
    totals: { subtotal: string; total: string };
    notes?: string;
  } | null = {
    invoiceNumber: "INV-1",
    billToName: "Customer",
    issueDate: "2025-01-01",
    currency: "USD",
    items: [{ description: "Service", qty: "1", unitPrice: "100", lineTotal: "100" }],
    totals: { subtotal: "100", total: "100" },
  };

  async getInvoicePdfModel(): Promise<any> {
    return this.model;
  }
}
