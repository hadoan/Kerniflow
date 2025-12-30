import type { LocalDate } from "@corely/kernel";

export type PurchaseOrderStatus =
  | "DRAFT"
  | "APPROVED"
  | "SENT"
  | "PARTIALLY_RECEIVED"
  | "RECEIVED"
  | "CLOSED"
  | "CANCELED";

export type VendorBillStatus = "DRAFT" | "APPROVED" | "POSTED" | "PARTIALLY_PAID" | "PAID" | "VOID";

export type BillPaymentMethod = "BANK_TRANSFER" | "CASH" | "CARD" | "OTHER";

export type PurchaseOrderLineItem = {
  id: string;
  description: string;
  quantity: number;
  unitCostCents: number;
  taxCode?: string;
  category?: string;
  sortOrder?: number;
};

export type VendorBillLineItem = {
  id: string;
  description: string;
  quantity: number;
  unitCostCents: number;
  category?: string;
  glAccountId?: string;
  taxCode?: string;
  sortOrder?: number;
};

export type PurchaseOrderTotals = {
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
};

export type VendorBillTotals = PurchaseOrderTotals & {
  paidCents: number;
  dueCents: number;
};

export type PurchaseOrderProps = {
  id: string;
  tenantId: string;
  poNumber: string | null;
  status: PurchaseOrderStatus;
  supplierPartyId: string;
  supplierContactPartyId?: string | null;
  orderDate?: LocalDate | null;
  expectedDeliveryDate?: LocalDate | null;
  currency: string;
  notes?: string | null;
  lineItems: PurchaseOrderLineItem[];
  totals: PurchaseOrderTotals;
  createdAt: Date;
  updatedAt: Date;
  approvedAt?: Date | null;
  sentAt?: Date | null;
  receivedAt?: Date | null;
  closedAt?: Date | null;
  canceledAt?: Date | null;
  linkedBillIds?: string[];
};

export type VendorBillProps = {
  id: string;
  tenantId: string;
  billNumber: string | null;
  internalBillRef?: string | null;
  status: VendorBillStatus;
  supplierPartyId: string;
  supplierContactPartyId?: string | null;
  billDate: LocalDate;
  dueDate: LocalDate;
  currency: string;
  paymentTerms?: string | null;
  notes?: string | null;
  lineItems: VendorBillLineItem[];
  totals: VendorBillTotals;
  createdAt: Date;
  updatedAt: Date;
  approvedAt?: Date | null;
  postedAt?: Date | null;
  voidedAt?: Date | null;
  purchaseOrderId?: string | null;
  postedJournalEntryId?: string | null;
  possibleDuplicateOfBillId?: string | null;
  duplicateScore?: number | null;
};

export type BillPayment = {
  id: string;
  vendorBillId: string;
  amountCents: number;
  currency: string;
  paymentDate: LocalDate;
  method: BillPaymentMethod;
  reference?: string | null;
  notes?: string | null;
  recordedAt: Date;
  recordedByUserId?: string | null;
  journalEntryId?: string | null;
};

export type PurchasingSettingsProps = {
  id: string;
  tenantId: string;
  defaultPaymentTerms?: string | null;
  defaultCurrency: string;
  poNumberingPrefix: string;
  poNextNumber: number;
  billInternalRefPrefix?: string | null;
  billNextNumber?: number | null;
  defaultAccountsPayableAccountId?: string | null;
  defaultExpenseAccountId?: string | null;
  defaultBankAccountId?: string | null;
  autoPostOnBillPost: boolean;
  autoPostOnPaymentRecord: boolean;
  billDuplicateDetectionEnabled: boolean;
  approvalRequiredForBills: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type PurchasingAccountMapping = {
  id: string;
  tenantId: string;
  supplierPartyId: string;
  categoryKey: string;
  glAccountId: string;
  createdAt: Date;
  updatedAt: Date;
};
