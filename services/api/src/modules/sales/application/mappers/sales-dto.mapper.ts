import type {
  QuoteDto,
  SalesInvoiceDto,
  SalesOrderDto,
  SalesPaymentDto,
  SalesSettingsDto,
} from "@kerniflow/contracts";
import { QuoteAggregate } from "../../domain/quote.aggregate";
import { SalesOrderAggregate } from "../../domain/order.aggregate";
import { SalesInvoiceAggregate } from "../../domain/invoice.aggregate";
import type { SalesPayment } from "../../domain/sales.types";
import { SalesSettingsAggregate } from "../../domain/settings.aggregate";

const toIso = (value: Date | null | undefined): string | null | undefined =>
  value ? value.toISOString() : value === null ? null : undefined;

export const toQuoteDto = (quote: QuoteAggregate): QuoteDto => ({
  id: quote.id,
  tenantId: quote.tenantId,
  number: quote.number,
  status: quote.status,
  customerPartyId: quote.customerPartyId,
  customerContactPartyId: quote.customerContactPartyId ?? undefined,
  issueDate: quote.issueDate ?? undefined,
  validUntilDate: quote.validUntilDate ?? undefined,
  currency: quote.currency,
  paymentTerms: quote.paymentTerms ?? undefined,
  notes: quote.notes ?? undefined,
  lineItems: quote.lineItems.map((item) => ({
    id: item.id,
    description: item.description,
    quantity: item.quantity,
    unitPriceCents: item.unitPriceCents,
    discountCents: item.discountCents ?? undefined,
    taxCode: item.taxCode ?? undefined,
    revenueCategory: item.revenueCategory ?? undefined,
    sortOrder: item.sortOrder ?? undefined,
  })),
  totals: quote.totals,
  sentAt: toIso(quote.sentAt) ?? undefined,
  acceptedAt: toIso(quote.acceptedAt) ?? undefined,
  rejectedAt: toIso(quote.rejectedAt) ?? undefined,
  createdAt: toIso(quote.createdAt) ?? "",
  updatedAt: toIso(quote.updatedAt) ?? "",
  convertedToSalesOrderId: quote.convertedToSalesOrderId ?? undefined,
  convertedToInvoiceId: quote.convertedToInvoiceId ?? undefined,
});

export const toOrderDto = (order: SalesOrderAggregate): SalesOrderDto => ({
  id: order.id,
  tenantId: order.tenantId,
  number: order.number,
  status: order.status,
  customerPartyId: order.customerPartyId,
  customerContactPartyId: order.customerContactPartyId ?? undefined,
  orderDate: order.orderDate ?? undefined,
  deliveryDate: order.deliveryDate ?? undefined,
  currency: order.currency,
  notes: order.notes ?? undefined,
  lineItems: order.lineItems.map((item) => ({
    id: item.id,
    description: item.description,
    quantity: item.quantity,
    unitPriceCents: item.unitPriceCents,
    discountCents: item.discountCents ?? undefined,
    taxCode: item.taxCode ?? undefined,
    revenueCategory: item.revenueCategory ?? undefined,
    sortOrder: item.sortOrder ?? undefined,
  })),
  totals: order.totals,
  confirmedAt: toIso(order.confirmedAt) ?? undefined,
  fulfilledAt: toIso(order.fulfilledAt) ?? undefined,
  canceledAt: toIso(order.canceledAt) ?? undefined,
  createdAt: toIso(order.createdAt) ?? "",
  updatedAt: toIso(order.updatedAt) ?? "",
  sourceQuoteId: order.sourceQuoteId ?? undefined,
  sourceInvoiceId: order.sourceInvoiceId ?? undefined,
});

export const toPaymentDto = (payment: SalesPayment): SalesPaymentDto => ({
  id: payment.id,
  invoiceId: payment.invoiceId,
  amountCents: payment.amountCents,
  currency: payment.currency,
  paymentDate: payment.paymentDate,
  method: payment.method,
  reference: payment.reference ?? undefined,
  notes: payment.notes ?? undefined,
  recordedAt: toIso(payment.recordedAt) ?? "",
  recordedByUserId: payment.recordedByUserId ?? undefined,
  journalEntryId: payment.journalEntryId ?? undefined,
});

export const toInvoiceDto = (invoice: SalesInvoiceAggregate): SalesInvoiceDto => ({
  id: invoice.id,
  tenantId: invoice.tenantId,
  number: invoice.number,
  status: invoice.status,
  customerPartyId: invoice.customerPartyId,
  customerContactPartyId: invoice.customerContactPartyId ?? undefined,
  issueDate: invoice.issueDate ?? undefined,
  dueDate: invoice.dueDate ?? undefined,
  currency: invoice.currency,
  paymentTerms: invoice.paymentTerms ?? undefined,
  notes: invoice.notes ?? undefined,
  lineItems: invoice.lineItems.map((item) => ({
    id: item.id,
    description: item.description,
    quantity: item.quantity,
    unitPriceCents: item.unitPriceCents,
    discountCents: item.discountCents ?? undefined,
    taxCode: item.taxCode ?? undefined,
    revenueCategory: item.revenueCategory ?? undefined,
    sortOrder: item.sortOrder ?? undefined,
  })),
  totals: invoice.totals,
  createdAt: toIso(invoice.createdAt) ?? "",
  updatedAt: toIso(invoice.updatedAt) ?? "",
  issuedAt: toIso(invoice.issuedAt) ?? undefined,
  voidedAt: toIso(invoice.voidedAt) ?? undefined,
  voidReason: invoice.voidReason ?? undefined,
  sourceSalesOrderId: invoice.sourceSalesOrderId ?? undefined,
  sourceQuoteId: invoice.sourceQuoteId ?? undefined,
  issuedJournalEntryId: invoice.issuedJournalEntryId ?? undefined,
  paymentJournalEntryIds: invoice.payments
    .map((payment) => payment.journalEntryId)
    .filter((value): value is string => Boolean(value)),
  payments: invoice.payments.length ? invoice.payments.map(toPaymentDto) : undefined,
});

export const toSettingsDto = (settings: SalesSettingsAggregate): SalesSettingsDto => ({
  id: settings.id,
  tenantId: settings.tenantId,
  defaultPaymentTerms: settings.defaultPaymentTerms ?? undefined,
  defaultCurrency: settings.defaultCurrency,
  quoteNumberPrefix: settings.quoteNumberPrefix,
  quoteNextNumber: settings.quoteNextNumber,
  orderNumberPrefix: settings.orderNumberPrefix,
  orderNextNumber: settings.orderNextNumber,
  invoiceNumberPrefix: settings.invoiceNumberPrefix,
  invoiceNextNumber: settings.invoiceNextNumber,
  defaultRevenueAccountId: settings.defaultRevenueAccountId ?? undefined,
  defaultAccountsReceivableAccountId: settings.defaultAccountsReceivableAccountId ?? undefined,
  defaultBankAccountId: settings.defaultBankAccountId ?? undefined,
  autoPostOnIssue: settings.autoPostOnIssue,
  autoPostOnPayment: settings.autoPostOnPayment,
  createdAt: toIso(settings.createdAt) ?? "",
  updatedAt: toIso(settings.updatedAt) ?? "",
});
