export type InvoiceEmailContext = {
  invoiceNumber: string;
  customerName: string;
  customerEmail: string;
  totalAmountCents: number;
  currency: string;
  invoiceDate: string | null;
  dueDate: string | null;
  publicInvoiceUrl?: string;
  pdfUrl?: string;
  companyName?: string;
};

export interface InvoiceEmailContextQueryPort {
  getInvoiceEmailContext(tenantId: string, invoiceId: string): Promise<InvoiceEmailContext | null>;
}
