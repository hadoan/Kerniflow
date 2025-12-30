import type { LocalDate } from "@corely/kernel";
import { calculateQuoteTotals } from "./totals";
import type { OrderLineItem, OrderProps, OrderStatus } from "./sales.types";

export class SalesOrderAggregate {
  id: string;
  tenantId: string;
  number: string | null;
  status: OrderStatus;
  customerPartyId: string;
  customerContactPartyId: string | null;
  orderDate: LocalDate | null;
  deliveryDate: LocalDate | null;
  currency: string;
  notes: string | null;
  lineItems: OrderLineItem[];
  totals: OrderProps["totals"];
  confirmedAt: Date | null;
  fulfilledAt: Date | null;
  canceledAt: Date | null;
  sourceQuoteId: string | null;
  sourceInvoiceId: string | null;
  createdAt: Date;
  updatedAt: Date;

  constructor(props: OrderProps) {
    this.id = props.id;
    this.tenantId = props.tenantId;
    this.number = props.number;
    this.status = props.status;
    this.customerPartyId = props.customerPartyId;
    this.customerContactPartyId = props.customerContactPartyId ?? null;
    this.orderDate = props.orderDate ?? null;
    this.deliveryDate = props.deliveryDate ?? null;
    this.currency = props.currency;
    this.notes = props.notes ?? null;
    this.lineItems = props.lineItems;
    this.totals = props.totals;
    this.confirmedAt = props.confirmedAt ?? null;
    this.fulfilledAt = props.fulfilledAt ?? null;
    this.canceledAt = props.canceledAt ?? null;
    this.sourceQuoteId = props.sourceQuoteId ?? null;
    this.sourceInvoiceId = props.sourceInvoiceId ?? null;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static createDraft(params: {
    id: string;
    tenantId: string;
    customerPartyId: string;
    customerContactPartyId?: string | null;
    orderDate?: LocalDate | null;
    deliveryDate?: LocalDate | null;
    currency: string;
    notes?: string | null;
    lineItems: OrderLineItem[];
    sourceQuoteId?: string | null;
    now: Date;
  }): SalesOrderAggregate {
    const totals = calculateQuoteTotals(params.lineItems);
    return new SalesOrderAggregate({
      id: params.id,
      tenantId: params.tenantId,
      number: null,
      status: "DRAFT",
      customerPartyId: params.customerPartyId,
      customerContactPartyId: params.customerContactPartyId ?? null,
      orderDate: params.orderDate ?? null,
      deliveryDate: params.deliveryDate ?? null,
      currency: params.currency,
      notes: params.notes ?? null,
      lineItems: params.lineItems,
      totals,
      confirmedAt: null,
      fulfilledAt: null,
      canceledAt: null,
      sourceQuoteId: params.sourceQuoteId ?? null,
      sourceInvoiceId: null,
      createdAt: params.now,
      updatedAt: params.now,
    });
  }

  updateHeader(
    patch: Partial<
      Pick<
        OrderProps,
        | "customerPartyId"
        | "customerContactPartyId"
        | "orderDate"
        | "deliveryDate"
        | "currency"
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
    if (patch.orderDate !== undefined) {
      this.orderDate = patch.orderDate ?? null;
    }
    if (patch.deliveryDate !== undefined) {
      this.deliveryDate = patch.deliveryDate ?? null;
    }
    if (patch.currency !== undefined) {
      this.currency = patch.currency;
    }
    if (patch.notes !== undefined) {
      this.notes = patch.notes ?? null;
    }
    this.touch(now);
  }

  replaceLineItems(lineItems: OrderLineItem[], now: Date) {
    this.ensureDraft();
    this.lineItems = lineItems;
    this.recalculateTotals();
    this.touch(now);
  }

  confirm(number: string, confirmedAt: Date, now: Date) {
    if (this.status !== "DRAFT") {
      throw new Error("Only draft orders can be confirmed");
    }
    if (!this.lineItems.length || this.totals.totalCents <= 0) {
      throw new Error("Order must have at least one line item with total > 0");
    }
    this.number = number;
    this.status = "CONFIRMED";
    this.confirmedAt = confirmedAt;
    this.touch(now);
  }

  fulfill(fulfilledAt: Date, now: Date) {
    if (this.status !== "CONFIRMED") {
      throw new Error("Only confirmed orders can be fulfilled");
    }
    this.status = "FULFILLED";
    this.fulfilledAt = fulfilledAt;
    this.touch(now);
  }

  markInvoiced(invoiceId: string, now: Date) {
    if (this.status === "CANCELED") {
      throw new Error("Canceled orders cannot be invoiced");
    }
    this.status = "INVOICED";
    this.sourceInvoiceId = invoiceId;
    this.touch(now);
  }

  cancel(canceledAt: Date, now: Date) {
    if (this.status === "INVOICED") {
      throw new Error("Cannot cancel an invoiced order");
    }
    this.status = "CANCELED";
    this.canceledAt = canceledAt;
    this.touch(now);
  }

  private ensureDraft() {
    if (this.status !== "DRAFT") {
      throw new Error("Order is not editable unless in draft");
    }
  }

  private recalculateTotals() {
    this.totals = calculateQuoteTotals(this.lineItems);
  }

  private touch(now: Date) {
    this.updatedAt = now;
  }
}
