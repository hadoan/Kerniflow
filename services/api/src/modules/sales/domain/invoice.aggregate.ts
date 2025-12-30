import type { LocalDate } from "@corely/kernel";
import { calculateInvoiceTotals } from "./totals";
import type {
  InvoiceLineItem,
  SalesInvoiceProps,
  SalesInvoiceStatus,
  SalesPayment,
} from "./sales.types";

export class SalesInvoiceAggregate {
  id: string;
  tenantId: string;
  number: string | null;
  status: SalesInvoiceStatus;
  customerPartyId: string;
  customerContactPartyId: string | null;
  issueDate: LocalDate | null;
  dueDate: LocalDate | null;
  currency: string;
  paymentTerms: string | null;
  notes: string | null;
  lineItems: InvoiceLineItem[];
  payments: SalesPayment[];
  totals: SalesInvoiceProps["totals"];
  createdAt: Date;
  updatedAt: Date;
  issuedAt: Date | null;
  voidedAt: Date | null;
  voidReason: string | null;
  sourceSalesOrderId: string | null;
  sourceQuoteId: string | null;
  issuedJournalEntryId: string | null;

  constructor(props: SalesInvoiceProps & { payments?: SalesPayment[] }) {
    this.id = props.id;
    this.tenantId = props.tenantId;
    this.number = props.number;
    this.status = props.status;
    this.customerPartyId = props.customerPartyId;
    this.customerContactPartyId = props.customerContactPartyId ?? null;
    this.issueDate = props.issueDate ?? null;
    this.dueDate = props.dueDate ?? null;
    this.currency = props.currency;
    this.paymentTerms = props.paymentTerms ?? null;
    this.notes = props.notes ?? null;
    this.lineItems = props.lineItems;
    this.payments = props.payments ?? [];
    this.totals = calculateInvoiceTotals(this.lineItems, this.payments);
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
    this.issuedAt = props.issuedAt ?? null;
    this.voidedAt = props.voidedAt ?? null;
    this.voidReason = props.voidReason ?? null;
    this.sourceSalesOrderId = props.sourceSalesOrderId ?? null;
    this.sourceQuoteId = props.sourceQuoteId ?? null;
    this.issuedJournalEntryId = props.issuedJournalEntryId ?? null;
  }

  static createDraft(params: {
    id: string;
    tenantId: string;
    customerPartyId: string;
    customerContactPartyId?: string | null;
    issueDate?: LocalDate | null;
    dueDate?: LocalDate | null;
    currency: string;
    paymentTerms?: string | null;
    notes?: string | null;
    lineItems: InvoiceLineItem[];
    sourceSalesOrderId?: string | null;
    sourceQuoteId?: string | null;
    now: Date;
  }): SalesInvoiceAggregate {
    const totals = calculateInvoiceTotals(params.lineItems, []);
    return new SalesInvoiceAggregate({
      id: params.id,
      tenantId: params.tenantId,
      number: null,
      status: "DRAFT",
      customerPartyId: params.customerPartyId,
      customerContactPartyId: params.customerContactPartyId ?? null,
      issueDate: params.issueDate ?? null,
      dueDate: params.dueDate ?? null,
      currency: params.currency,
      paymentTerms: params.paymentTerms ?? null,
      notes: params.notes ?? null,
      lineItems: params.lineItems,
      payments: [],
      totals,
      createdAt: params.now,
      updatedAt: params.now,
      issuedAt: null,
      voidedAt: null,
      voidReason: null,
      sourceSalesOrderId: params.sourceSalesOrderId ?? null,
      sourceQuoteId: params.sourceQuoteId ?? null,
      issuedJournalEntryId: null,
    });
  }

  updateHeader(
    patch: Partial<
      Pick<
        SalesInvoiceProps,
        | "customerPartyId"
        | "customerContactPartyId"
        | "issueDate"
        | "dueDate"
        | "currency"
        | "paymentTerms"
        | "notes"
      >
    >,
    now: Date
  ) {
    this.ensureDraft();
    if (patch.customerPartyId !== undefined) {
      this.customerPartyId = patch.customerPartyId;
    }
    if (patch.customerContactPartyId !== undefined) {
      this.customerContactPartyId = patch.customerContactPartyId ?? null;
    }
    if (patch.issueDate !== undefined) {
      this.issueDate = patch.issueDate ?? null;
    }
    if (patch.dueDate !== undefined) {
      this.dueDate = patch.dueDate ?? null;
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
    this.touch(now);
  }

  replaceLineItems(lineItems: InvoiceLineItem[], now: Date) {
    this.ensureDraft();
    this.lineItems = lineItems;
    this.recalculateTotals();
    this.touch(now);
  }

  issue(number: string, issuedAt: Date, now: Date) {
    this.ensureDraft();
    if (!this.lineItems.length || this.totals.totalCents <= 0) {
      throw new Error("Invoice must have at least one line item with total > 0");
    }
    this.number = number;
    this.status = "ISSUED";
    this.issuedAt = issuedAt;
    this.touch(now);
  }

  void(reason: string | undefined, voidedAt: Date, now: Date) {
    if (this.status === "PAID" || this.status === "VOID") {
      throw new Error("Only unpaid invoices can be voided");
    }
    this.status = "VOID";
    this.voidedAt = voidedAt;
    this.voidReason = reason ?? null;
    this.touch(now);
  }

  addPayment(payment: SalesPayment, now: Date) {
    if (this.status !== "ISSUED" && this.status !== "PARTIALLY_PAID") {
      throw new Error("Payments can only be recorded on issued invoices");
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

  removePayment(paymentId: string, now: Date) {
    const nextPayments = this.payments.filter((item) => item.id !== paymentId);
    if (nextPayments.length === this.payments.length) {
      throw new Error("Payment not found on invoice");
    }
    this.payments = nextPayments;
    this.recalculateTotals();
    if (this.totals.paidCents === 0) {
      this.status = "ISSUED";
    } else if (this.totals.dueCents > 0) {
      this.status = "PARTIALLY_PAID";
    } else {
      this.status = "PAID";
    }
    this.touch(now);
  }

  setIssuedJournalEntry(entryId: string, now: Date) {
    this.issuedJournalEntryId = entryId;
    this.touch(now);
  }

  private ensureDraft() {
    if (this.status !== "DRAFT") {
      throw new Error("Invoice is not editable unless in draft");
    }
  }

  private recalculateTotals() {
    this.totals = calculateInvoiceTotals(this.lineItems, this.payments);
  }

  private touch(now: Date) {
    this.updatedAt = now;
  }
}
