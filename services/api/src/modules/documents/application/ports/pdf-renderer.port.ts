export interface PdfRendererPort {
  renderInvoicePdf(args: {
    tenantId: string;
    invoiceId: string;
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
    };
  }): Promise<Buffer>;
}
