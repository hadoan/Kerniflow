import type { LocalDate } from "@corely/kernel";

export type QuoteStatus = "DRAFT" | "SENT" | "ACCEPTED" | "REJECTED" | "CONVERTED" | "EXPIRED";
export type OrderStatus = "DRAFT" | "CONFIRMED" | "FULFILLED" | "INVOICED" | "CANCELED";
export type SalesInvoiceStatus = "DRAFT" | "ISSUED" | "PARTIALLY_PAID" | "PAID" | "VOID";

export type PaymentMethod = "BANK_TRANSFER" | "CASH" | "CARD" | "OTHER";

export type QuoteLineItem = {
  id: string;
  description: string;
  quantity: number;
  unitPriceCents: number;
  discountCents?: number;
  taxCode?: string;
  revenueCategory?: string;
  sortOrder?: number;
};

export type OrderLineItem = QuoteLineItem;
export type InvoiceLineItem = QuoteLineItem;

export type QuoteTotals = {
  subtotalCents: number;
  discountCents: number;
  taxCents: number;
  totalCents: number;
};

export type OrderTotals = QuoteTotals;

export type InvoiceTotals = QuoteTotals & {
  paidCents: number;
  dueCents: number;
};

export type QuoteProps = {
  id: string;
  tenantId: string;
  number: string | null;
  status: QuoteStatus;
  customerPartyId: string;
  customerContactPartyId?: string | null;
  issueDate?: LocalDate | null;
  validUntilDate?: LocalDate | null;
  currency: string;
  paymentTerms?: string | null;
  notes?: string | null;
  lineItems: QuoteLineItem[];
  totals: QuoteTotals;
  sentAt?: Date | null;
  acceptedAt?: Date | null;
  rejectedAt?: Date | null;
  convertedToSalesOrderId?: string | null;
  convertedToInvoiceId?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type OrderProps = {
  id: string;
  tenantId: string;
  number: string | null;
  status: OrderStatus;
  customerPartyId: string;
  customerContactPartyId?: string | null;
  orderDate?: LocalDate | null;
  deliveryDate?: LocalDate | null;
  currency: string;
  notes?: string | null;
  lineItems: OrderLineItem[];
  totals: OrderTotals;
  confirmedAt?: Date | null;
  fulfilledAt?: Date | null;
  canceledAt?: Date | null;
  sourceQuoteId?: string | null;
  sourceInvoiceId?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type SalesInvoiceProps = {
  id: string;
  tenantId: string;
  number: string | null;
  status: SalesInvoiceStatus;
  customerPartyId: string;
  customerContactPartyId?: string | null;
  issueDate?: LocalDate | null;
  dueDate?: LocalDate | null;
  currency: string;
  paymentTerms?: string | null;
  notes?: string | null;
  lineItems: InvoiceLineItem[];
  totals: InvoiceTotals;
  createdAt: Date;
  updatedAt: Date;
  issuedAt?: Date | null;
  voidedAt?: Date | null;
  voidReason?: string | null;
  sourceSalesOrderId?: string | null;
  sourceQuoteId?: string | null;
  issuedJournalEntryId?: string | null;
};

export type SalesPayment = {
  id: string;
  invoiceId: string;
  amountCents: number;
  currency: string;
  paymentDate: LocalDate;
  method: PaymentMethod;
  reference?: string | null;
  notes?: string | null;
  recordedAt: Date;
  recordedByUserId?: string | null;
  journalEntryId?: string | null;
};

export type SalesSettingsProps = {
  id: string;
  tenantId: string;
  defaultPaymentTerms?: string | null;
  defaultCurrency: string;
  quoteNumberPrefix: string;
  quoteNextNumber: number;
  orderNumberPrefix: string;
  orderNextNumber: number;
  invoiceNumberPrefix: string;
  invoiceNextNumber: number;
  defaultRevenueAccountId?: string | null;
  defaultAccountsReceivableAccountId?: string | null;
  defaultBankAccountId?: string | null;
  autoPostOnIssue: boolean;
  autoPostOnPayment: boolean;
  createdAt: Date;
  updatedAt: Date;
};
