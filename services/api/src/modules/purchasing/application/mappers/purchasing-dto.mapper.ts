import type {
  PurchaseOrderDto,
  VendorBillDto,
  BillPaymentDto,
  PurchasingSettingsDto,
  PurchasingAccountMappingDto,
} from "@corely/contracts";
import { type PurchaseOrderAggregate } from "../../domain/purchase-order.aggregate";
import { type VendorBillAggregate } from "../../domain/vendor-bill.aggregate";
import type { BillPayment, PurchasingAccountMapping } from "../../domain/purchasing.types";
import { type PurchasingSettingsAggregate } from "../../domain/settings.aggregate";

const toIso = (value: Date | null | undefined): string | null | undefined =>
  value ? value.toISOString() : value === null ? null : undefined;

export const toPurchaseOrderDto = (order: PurchaseOrderAggregate): PurchaseOrderDto => ({
  id: order.id,
  tenantId: order.tenantId,
  poNumber: order.poNumber,
  status: order.status,
  supplierPartyId: order.supplierPartyId,
  supplierContactPartyId: order.supplierContactPartyId ?? undefined,
  orderDate: order.orderDate ?? undefined,
  expectedDeliveryDate: order.expectedDeliveryDate ?? undefined,
  currency: order.currency,
  notes: order.notes ?? undefined,
  lineItems: order.lineItems.map((item) => ({
    id: item.id,
    description: item.description,
    quantity: item.quantity,
    unitCostCents: item.unitCostCents,
    taxCode: item.taxCode ?? undefined,
    category: item.category ?? undefined,
    sortOrder: item.sortOrder ?? undefined,
  })),
  totals: order.totals,
  createdAt: toIso(order.createdAt) ?? "",
  updatedAt: toIso(order.updatedAt) ?? "",
  approvedAt: toIso(order.approvedAt) ?? undefined,
  sentAt: toIso(order.sentAt) ?? undefined,
  receivedAt: toIso(order.receivedAt) ?? undefined,
  closedAt: toIso(order.closedAt) ?? undefined,
});

export const toBillPaymentDto = (payment: BillPayment): BillPaymentDto => ({
  id: payment.id,
  vendorBillId: payment.vendorBillId,
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

export const toVendorBillDto = (bill: VendorBillAggregate): VendorBillDto => ({
  id: bill.id,
  tenantId: bill.tenantId,
  billNumber: bill.billNumber,
  internalBillRef: bill.internalBillRef ?? undefined,
  status: bill.status,
  supplierPartyId: bill.supplierPartyId,
  supplierContactPartyId: bill.supplierContactPartyId ?? undefined,
  billDate: bill.billDate,
  dueDate: bill.dueDate,
  currency: bill.currency,
  paymentTerms: bill.paymentTerms ?? undefined,
  notes: bill.notes ?? undefined,
  lineItems: bill.lineItems.map((item) => ({
    id: item.id,
    description: item.description,
    quantity: item.quantity,
    unitCostCents: item.unitCostCents,
    category: item.category ?? undefined,
    glAccountId: item.glAccountId ?? undefined,
    taxCode: item.taxCode ?? undefined,
    sortOrder: item.sortOrder ?? undefined,
  })),
  totals: bill.totals,
  createdAt: toIso(bill.createdAt) ?? "",
  updatedAt: toIso(bill.updatedAt) ?? "",
  approvedAt: toIso(bill.approvedAt) ?? undefined,
  postedAt: toIso(bill.postedAt) ?? undefined,
  voidedAt: toIso(bill.voidedAt) ?? undefined,
  purchaseOrderId: bill.purchaseOrderId ?? undefined,
  postedJournalEntryId: bill.postedJournalEntryId ?? undefined,
  paymentJournalEntryIds: bill.payments
    .map((payment) => payment.journalEntryId)
    .filter((value): value is string => Boolean(value)),
  payments: bill.payments.length ? bill.payments.map(toBillPaymentDto) : undefined,
  possibleDuplicateOfBillId: bill.possibleDuplicateOfBillId ?? undefined,
  duplicateScore: bill.duplicateScore ?? undefined,
});

export const toSettingsDto = (settings: PurchasingSettingsAggregate): PurchasingSettingsDto => ({
  id: settings.toProps().id,
  tenantId: settings.toProps().tenantId,
  defaultPaymentTerms: settings.toProps().defaultPaymentTerms ?? undefined,
  defaultCurrency: settings.toProps().defaultCurrency,
  poNumberingPrefix: settings.toProps().poNumberingPrefix,
  poNextNumber: settings.toProps().poNextNumber,
  billInternalRefPrefix: settings.toProps().billInternalRefPrefix ?? undefined,
  billNextNumber: settings.toProps().billNextNumber ?? undefined,
  defaultAccountsPayableAccountId: settings.toProps().defaultAccountsPayableAccountId ?? undefined,
  defaultExpenseAccountId: settings.toProps().defaultExpenseAccountId ?? undefined,
  defaultBankAccountId: settings.toProps().defaultBankAccountId ?? undefined,
  autoPostOnBillPost: settings.toProps().autoPostOnBillPost,
  autoPostOnPaymentRecord: settings.toProps().autoPostOnPaymentRecord,
  billDuplicateDetectionEnabled: settings.toProps().billDuplicateDetectionEnabled,
  approvalRequiredForBills: settings.toProps().approvalRequiredForBills,
  createdAt: toIso(settings.toProps().createdAt) ?? "",
  updatedAt: toIso(settings.toProps().updatedAt) ?? "",
});

export const toAccountMappingDto = (
  mapping: PurchasingAccountMapping
): PurchasingAccountMappingDto => ({
  id: mapping.id,
  tenantId: mapping.tenantId,
  supplierPartyId: mapping.supplierPartyId,
  categoryKey: mapping.categoryKey,
  glAccountId: mapping.glAccountId,
  createdAt: toIso(mapping.createdAt) ?? "",
  updatedAt: toIso(mapping.updatedAt) ?? "",
});
