export interface InvoicePdfModelPort {
  getInvoicePdfModel(
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
  } | null>;
}

export const INVOICE_PDF_MODEL_PORT = Symbol("INVOICE_PDF_MODEL_PORT");
