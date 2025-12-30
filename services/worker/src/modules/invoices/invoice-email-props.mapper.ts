import type { InvoiceEmailProps } from "@corely/email-templates/invoices";

type BillToFields = {
  billToName?: string | null;
  billToEmail?: string | null;
  billToVatId?: string | null;
  billToAddressLine1?: string | null;
  billToAddressLine2?: string | null;
  billToCity?: string | null;
  billToPostalCode?: string | null;
  billToCountry?: string | null;
};

type InvoiceLineLike = {
  description: string;
  qty: number;
  unitPriceCents: number;
};

type InvoiceLike = BillToFields & {
  number?: string | null;
  currency: string;
  dueDate?: Date | null;
  lines: InvoiceLineLike[];
};

type MapperInput = {
  invoice: InvoiceLike;
  companyName: string;
  customMessage?: string | undefined;
  viewInvoiceUrl?: string | undefined;
  locale?: string | undefined;
};

export function mapToInvoiceEmailProps(input: MapperInput): InvoiceEmailProps {
  const { invoice, companyName, customMessage, viewInvoiceUrl, locale } = input;

  // Calculate total amount
  const totalAmountCents = invoice.lines.reduce(
    (sum: number, line: InvoiceLineLike) => sum + line.qty * line.unitPriceCents,
    0
  );

  // Format currency amounts
  const formatAmount = (amountCents: number): string => {
    const amount = amountCents / 100;
    return new Intl.NumberFormat(locale ?? "en-US", {
      style: "currency",
      currency: invoice.currency.toUpperCase(),
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // Format date
  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat(locale ?? "en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(date);
  };

  return {
    invoiceNumber: invoice.number ?? "DRAFT",
    companyName,
    dueDate: invoice.dueDate ? formatDate(invoice.dueDate) : "Upon receipt",
    totalAmount: formatAmount(totalAmountCents),
    currency: invoice.currency.toUpperCase(),
    customerName: invoice.billToName ?? "Customer",
    customMessage,
    lines: invoice.lines.map((line: InvoiceLineLike) => ({
      description: line.description,
      quantity: line.qty,
      unitPrice: formatAmount(line.unitPriceCents),
      amount: formatAmount(line.qty * line.unitPriceCents),
    })),
    viewInvoiceUrl,
    locale,
  };
}
