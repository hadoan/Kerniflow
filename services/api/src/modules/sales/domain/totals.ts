import type { QuoteLineItem, QuoteTotals, InvoiceTotals, SalesPayment } from "./sales.types";

export const calculateQuoteTotals = (lineItems: QuoteLineItem[]): QuoteTotals => {
  const subtotalCents = lineItems.reduce(
    (sum, item) => sum + item.quantity * item.unitPriceCents,
    0
  );
  const discountCents = lineItems.reduce((sum, item) => sum + (item.discountCents ?? 0), 0);
  const taxCents = 0;
  const totalCents = Math.max(subtotalCents - discountCents + taxCents, 0);
  return { subtotalCents, discountCents, taxCents, totalCents };
};

export const calculateInvoiceTotals = (
  lineItems: QuoteLineItem[],
  payments: SalesPayment[]
): InvoiceTotals => {
  const base = calculateQuoteTotals(lineItems);
  const paidCents = payments.reduce((sum, payment) => sum + payment.amountCents, 0);
  const dueCents = Math.max(base.totalCents - paidCents, 0);
  return { ...base, paidCents, dueCents };
};
