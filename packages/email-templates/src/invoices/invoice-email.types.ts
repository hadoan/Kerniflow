export type InvoiceEmailProps = {
  invoiceNumber: string;
  companyName: string;
  dueDate: string;
  totalAmount: string;
  currency: string;
  customerName: string;
  customMessage?: string | undefined;
  lines: Array<{
    description: string;
    quantity: number;
    unitPrice: string;
    amount: string;
  }>;
  viewInvoiceUrl?: string | undefined;
  locale?: string | undefined;
};
