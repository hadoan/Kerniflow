import type { LocalDate } from "@corely/kernel";
import { calculateVendorBillTotals } from "./totals";
import type {
  VendorBillLineItem,
  VendorBillProps,
  VendorBillStatus,
  BillPayment,
} from "./purchasing.types";

export class VendorBillAggregate {
  id: string;
  tenantId: string;
  billNumber: string | null;
  internalBillRef: string | null;
  status: VendorBillStatus;
  supplierPartyId: string;
  supplierContactPartyId: string | null;
  billDate: LocalDate;
  dueDate: LocalDate;
  currency: string;
  paymentTerms: string | null;
  notes: string | null;
  lineItems: VendorBillLineItem[];
  payments: BillPayment[];
  totals: VendorBillProps["totals"];
  createdAt: Date;
  updatedAt: Date;
  approvedAt: Date | null;
  postedAt: Date | null;
  voidedAt: Date | null;
  purchaseOrderId: string | null;
  postedJournalEntryId: string | null;
  possibleDuplicateOfBillId: string | null;
  duplicateScore: number | null;

  constructor(props: VendorBillProps & { payments?: BillPayment[] }) {
    this.id = props.id;
    this.tenantId = props.tenantId;
    this.billNumber = props.billNumber;
    this.internalBillRef = props.internalBillRef ?? null;
    this.status = props.status;
    this.supplierPartyId = props.supplierPartyId;
    this.supplierContactPartyId = props.supplierContactPartyId ?? null;
    this.billDate = props.billDate;
    this.dueDate = props.dueDate;
    this.currency = props.currency;
    this.paymentTerms = props.paymentTerms ?? null;
    this.notes = props.notes ?? null;
    this.lineItems = props.lineItems;
    this.payments = props.payments ?? [];
    this.totals = props.totals;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
    this.approvedAt = props.approvedAt ?? null;
    this.postedAt = props.postedAt ?? null;
    this.voidedAt = props.voidedAt ?? null;
    this.purchaseOrderId = props.purchaseOrderId ?? null;
    this.postedJournalEntryId = props.postedJournalEntryId ?? null;
    this.possibleDuplicateOfBillId = props.possibleDuplicateOfBillId ?? null;
    this.duplicateScore = props.duplicateScore ?? null;
  }

  static createDraft(params: {
    id: string;
    tenantId: string;
    supplierPartyId: string;
    supplierContactPartyId?: string | null;
    billNumber?: string | null;
    internalBillRef?: string | null;
    billDate: LocalDate;
    dueDate: LocalDate;
    currency: string;
    paymentTerms?: string | null;
    notes?: string | null;
    lineItems: VendorBillLineItem[];
    purchaseOrderId?: string | null;
    now: Date;
  }): VendorBillAggregate {
    const totals = calculateVendorBillTotals(params.lineItems, []);
    return new VendorBillAggregate({
      id: params.id,
      tenantId: params.tenantId,
      billNumber: params.billNumber ?? null,
      internalBillRef: params.internalBillRef ?? null,
      status: "DRAFT",
      supplierPartyId: params.supplierPartyId,
      supplierContactPartyId: params.supplierContactPartyId ?? null,
      billDate: params.billDate,
      dueDate: params.dueDate,
      currency: params.currency,
      paymentTerms: params.paymentTerms ?? null,
      notes: params.notes ?? null,
      lineItems: params.lineItems,
      totals,
      createdAt: params.now,
      updatedAt: params.now,
      approvedAt: null,
      postedAt: null,
      voidedAt: null,
      purchaseOrderId: params.purchaseOrderId ?? null,
      postedJournalEntryId: null,
      possibleDuplicateOfBillId: null,
      duplicateScore: null,
    });
  }

  updateHeader(
    patch: Partial<
      Pick<
        VendorBillProps,
        | "supplierPartyId"
        | "supplierContactPartyId"
        | "billNumber"
        | "internalBillRef"
        | "billDate"
        | "dueDate"
        | "currency"
        | "paymentTerms"
        | "notes"
        | "purchaseOrderId"
      >
    >,
    now: Date
  ) {
    this.ensureDraft();
    if (patch.supplierPartyId !== undefined) {
      this.supplierPartyId = patch.supplierPartyId;
    }
    if (patch.supplierContactPartyId !== undefined) {
      this.supplierContactPartyId = patch.supplierContactPartyId ?? null;
    }
    if (patch.billNumber !== undefined) {
      this.billNumber = patch.billNumber ?? null;
    }
    if (patch.internalBillRef !== undefined) {
      this.internalBillRef = patch.internalBillRef ?? null;
    }
    if (patch.billDate !== undefined) {
      this.billDate = patch.billDate;
    }
    if (patch.dueDate !== undefined) {
      this.dueDate = patch.dueDate;
    }
    if (patch.currency !== undefined) {
      this.currency = patch.currency;
    }
    if (patch.paymentTerms !== undefined) {
      this.paymentTerms = patch.paymentTerms ?? null;
    }
    if (patch.notes !== undefined) {
      this.notes = patch.notes ?? null;
    }
    if (patch.purchaseOrderId !== undefined) {
      this.purchaseOrderId = patch.purchaseOrderId ?? null;
    }
    this.touch(now);
  }

  replaceLineItems(lineItems: VendorBillLineItem[], now: Date) {
    this.ensureDraft();
    this.lineItems = lineItems;
    this.recalculateTotals();
    this.touch(now);
  }

  approve(approvedAt: Date, now: Date) {
    this.ensureDraft();
    if (!this.lineItems.length || this.totals.totalCents <= 0) {
      throw new Error("Vendor bill must have at least one line item with total > 0");
    }
    this.status = "APPROVED";
    this.approvedAt = approvedAt;
    this.touch(now);
  }

  post(postedAt: Date, now: Date) {
    if (this.status !== "APPROVED") {
      throw new Error("Only approved vendor bills can be posted");
    }
    this.status = "POSTED";
    this.postedAt = postedAt;
    this.touch(now);
  }

  void(voidedAt: Date, now: Date) {
    if (this.status === "POSTED" || this.status === "PAID" || this.status === "PARTIALLY_PAID") {
      throw new Error("Posted or paid vendor bills cannot be voided in v1");
    }
    this.status = "VOID";
    this.voidedAt = voidedAt;
    this.touch(now);
  }

  addPayment(payment: BillPayment, now: Date) {
    if (this.status !== "POSTED" && this.status !== "PARTIALLY_PAID") {
      throw new Error("Payments can only be recorded on posted vendor bills");
    }
    this.payments = [...this.payments, payment];
    this.recalculateTotals();
    if (this.totals.dueCents <= 0) {
      this.status = "PAID";
    } else {
      this.status = "PARTIALLY_PAID";
    }
    this.touch(now);
  }

  setPostedJournalEntry(entryId: string, now: Date) {
    this.postedJournalEntryId = entryId;
    this.touch(now);
  }

  setDuplicateRisk(
    params: { possibleDuplicateOfBillId?: string | null; duplicateScore?: number | null },
    now: Date
  ) {
    this.possibleDuplicateOfBillId = params.possibleDuplicateOfBillId ?? null;
    this.duplicateScore = params.duplicateScore ?? null;
    this.touch(now);
  }

  private ensureDraft() {
    if (this.status !== "DRAFT") {
      throw new Error("Vendor bill is not editable unless in draft");
    }
  }

  private recalculateTotals() {
    this.totals = calculateVendorBillTotals(this.lineItems, this.payments);
  }

  private touch(now: Date) {
    this.updatedAt = now;
  }
}
