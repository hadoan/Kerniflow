import type { LocalDate } from "@corely/kernel";
import { calculateQuoteTotals } from "./totals";
import type { QuoteLineItem, QuoteProps, QuoteStatus } from "./sales.types";

export class QuoteAggregate {
  id: string;
  tenantId: string;
  number: string | null;
  status: QuoteStatus;
  customerPartyId: string;
  customerContactPartyId: string | null;
  issueDate: LocalDate | null;
  validUntilDate: LocalDate | null;
  currency: string;
  paymentTerms: string | null;
  notes: string | null;
  lineItems: QuoteLineItem[];
  totals: QuoteProps["totals"];
  sentAt: Date | null;
  acceptedAt: Date | null;
  rejectedAt: Date | null;
  convertedToSalesOrderId: string | null;
  convertedToInvoiceId: string | null;
  createdAt: Date;
  updatedAt: Date;

  constructor(props: QuoteProps) {
    this.id = props.id;
    this.tenantId = props.tenantId;
    this.number = props.number;
    this.status = props.status;
    this.customerPartyId = props.customerPartyId;
    this.customerContactPartyId = props.customerContactPartyId ?? null;
    this.issueDate = props.issueDate ?? null;
    this.validUntilDate = props.validUntilDate ?? null;
    this.currency = props.currency;
    this.paymentTerms = props.paymentTerms ?? null;
    this.notes = props.notes ?? null;
    this.lineItems = props.lineItems;
    this.totals = props.totals;
    this.sentAt = props.sentAt ?? null;
    this.acceptedAt = props.acceptedAt ?? null;
    this.rejectedAt = props.rejectedAt ?? null;
    this.convertedToSalesOrderId = props.convertedToSalesOrderId ?? null;
    this.convertedToInvoiceId = props.convertedToInvoiceId ?? null;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static createDraft(params: {
    id: string;
    tenantId: string;
    customerPartyId: string;
    customerContactPartyId?: string | null;
    issueDate?: LocalDate | null;
    validUntilDate?: LocalDate | null;
    currency: string;
    paymentTerms?: string | null;
    notes?: string | null;
    lineItems: QuoteLineItem[];
    now: Date;
  }): QuoteAggregate {
    const totals = calculateQuoteTotals(params.lineItems);
    return new QuoteAggregate({
      id: params.id,
      tenantId: params.tenantId,
      number: null,
      status: "DRAFT",
      customerPartyId: params.customerPartyId,
      customerContactPartyId: params.customerContactPartyId ?? null,
      issueDate: params.issueDate ?? null,
      validUntilDate: params.validUntilDate ?? null,
      currency: params.currency,
      paymentTerms: params.paymentTerms ?? null,
      notes: params.notes ?? null,
      lineItems: params.lineItems,
      totals,
      sentAt: null,
      acceptedAt: null,
      rejectedAt: null,
      convertedToSalesOrderId: null,
      convertedToInvoiceId: null,
      createdAt: params.now,
      updatedAt: params.now,
    });
  }

  updateHeader(
    patch: Partial<
      Pick<
        QuoteProps,
        | "customerPartyId"
        | "customerContactPartyId"
        | "issueDate"
        | "validUntilDate"
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
    if (patch.validUntilDate !== undefined) {
      this.validUntilDate = patch.validUntilDate ?? null;
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

  replaceLineItems(lineItems: QuoteLineItem[], now: Date) {
    this.ensureDraft();
    this.lineItems = lineItems;
    this.recalculateTotals();
    this.touch(now);
  }

  send(number: string, sentAt: Date, now: Date) {
    this.ensureDraft();
    if (!this.lineItems.length || this.totals.totalCents <= 0) {
      throw new Error("Quote must have at least one line item with total > 0");
    }
    this.number = number;
    this.status = "SENT";
    this.sentAt = sentAt;
    this.touch(now);
  }

  accept(acceptedAt: Date, now: Date) {
    if (this.status !== "SENT") {
      throw new Error("Quote can only be accepted from SENT status");
    }
    this.status = "ACCEPTED";
    this.acceptedAt = acceptedAt;
    this.touch(now);
  }

  reject(rejectedAt: Date, now: Date) {
    if (this.status !== "SENT") {
      throw new Error("Quote can only be rejected from SENT status");
    }
    this.status = "REJECTED";
    this.rejectedAt = rejectedAt;
    this.touch(now);
  }

  markConverted(params: { orderId?: string | null; invoiceId?: string | null }, now: Date) {
    if (this.status !== "ACCEPTED" && this.status !== "SENT") {
      throw new Error("Quote must be accepted or sent before conversion");
    }
    if (params.orderId) {
      this.convertedToSalesOrderId = params.orderId;
    }
    if (params.invoiceId) {
      this.convertedToInvoiceId = params.invoiceId;
    }
    this.status = "CONVERTED";
    this.touch(now);
  }

  private ensureDraft() {
    if (this.status !== "DRAFT") {
      throw new Error("Quote is not editable unless in draft");
    }
  }

  private recalculateTotals() {
    this.totals = calculateQuoteTotals(this.lineItems);
  }

  private touch(now: Date) {
    this.updatedAt = now;
  }
}
