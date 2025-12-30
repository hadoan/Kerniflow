import type { LocalDate } from "@corely/kernel";
import { calculatePurchaseOrderTotals } from "./totals";
import type {
  PurchaseOrderLineItem,
  PurchaseOrderProps,
  PurchaseOrderStatus,
} from "./purchasing.types";

export class PurchaseOrderAggregate {
  id: string;
  tenantId: string;
  poNumber: string | null;
  status: PurchaseOrderStatus;
  supplierPartyId: string;
  supplierContactPartyId: string | null;
  orderDate: LocalDate | null;
  expectedDeliveryDate: LocalDate | null;
  currency: string;
  notes: string | null;
  lineItems: PurchaseOrderLineItem[];
  totals: PurchaseOrderProps["totals"];
  createdAt: Date;
  updatedAt: Date;
  approvedAt: Date | null;
  sentAt: Date | null;
  receivedAt: Date | null;
  closedAt: Date | null;
  canceledAt: Date | null;

  constructor(props: PurchaseOrderProps) {
    this.id = props.id;
    this.tenantId = props.tenantId;
    this.poNumber = props.poNumber;
    this.status = props.status;
    this.supplierPartyId = props.supplierPartyId;
    this.supplierContactPartyId = props.supplierContactPartyId ?? null;
    this.orderDate = props.orderDate ?? null;
    this.expectedDeliveryDate = props.expectedDeliveryDate ?? null;
    this.currency = props.currency;
    this.notes = props.notes ?? null;
    this.lineItems = props.lineItems;
    this.totals = props.totals;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
    this.approvedAt = props.approvedAt ?? null;
    this.sentAt = props.sentAt ?? null;
    this.receivedAt = props.receivedAt ?? null;
    this.closedAt = props.closedAt ?? null;
    this.canceledAt = props.canceledAt ?? null;
  }

  static createDraft(params: {
    id: string;
    tenantId: string;
    supplierPartyId: string;
    supplierContactPartyId?: string | null;
    orderDate?: LocalDate | null;
    expectedDeliveryDate?: LocalDate | null;
    currency: string;
    notes?: string | null;
    lineItems: PurchaseOrderLineItem[];
    now: Date;
  }): PurchaseOrderAggregate {
    const totals = calculatePurchaseOrderTotals(params.lineItems);
    return new PurchaseOrderAggregate({
      id: params.id,
      tenantId: params.tenantId,
      poNumber: null,
      status: "DRAFT",
      supplierPartyId: params.supplierPartyId,
      supplierContactPartyId: params.supplierContactPartyId ?? null,
      orderDate: params.orderDate ?? null,
      expectedDeliveryDate: params.expectedDeliveryDate ?? null,
      currency: params.currency,
      notes: params.notes ?? null,
      lineItems: params.lineItems,
      totals,
      createdAt: params.now,
      updatedAt: params.now,
      approvedAt: null,
      sentAt: null,
      receivedAt: null,
      closedAt: null,
      canceledAt: null,
    });
  }

  updateHeader(
    patch: Partial<
      Pick<
        PurchaseOrderProps,
        | "supplierPartyId"
        | "supplierContactPartyId"
        | "orderDate"
        | "expectedDeliveryDate"
        | "currency"
        | "notes"
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
    if (patch.orderDate !== undefined) {
      this.orderDate = patch.orderDate ?? null;
    }
    if (patch.expectedDeliveryDate !== undefined) {
      this.expectedDeliveryDate = patch.expectedDeliveryDate ?? null;
    }
    if (patch.currency !== undefined) {
      this.currency = patch.currency;
    }
    if (patch.notes !== undefined) {
      this.notes = patch.notes ?? null;
    }
    this.touch(now);
  }

  replaceLineItems(lineItems: PurchaseOrderLineItem[], now: Date) {
    this.ensureDraft();
    this.lineItems = lineItems;
    this.recalculateTotals();
    this.touch(now);
  }

  approve(number: string, approvedAt: Date, now: Date) {
    this.ensureDraft();
    if (!this.lineItems.length || this.totals.totalCents <= 0) {
      throw new Error("Purchase order must have at least one line item with total > 0");
    }
    this.poNumber = number;
    this.status = "APPROVED";
    this.approvedAt = approvedAt;
    this.touch(now);
  }

  markSent(sentAt: Date, now: Date) {
    if (this.status !== "APPROVED") {
      throw new Error("Only approved purchase orders can be sent");
    }
    this.status = "SENT";
    this.sentAt = sentAt;
    this.touch(now);
  }

  markReceived(receivedAt: Date, now: Date) {
    if (this.status !== "SENT" && this.status !== "APPROVED") {
      throw new Error("Only sent or approved purchase orders can be received");
    }
    this.status = "RECEIVED";
    this.receivedAt = receivedAt;
    this.touch(now);
  }

  close(closedAt: Date, now: Date) {
    if (this.status === "CANCELED") {
      throw new Error("Canceled purchase orders cannot be closed");
    }
    if (this.status !== "RECEIVED" && this.status !== "SENT" && this.status !== "APPROVED") {
      throw new Error("Purchase order must be received or sent before closing");
    }
    this.status = "CLOSED";
    this.closedAt = closedAt;
    this.touch(now);
  }

  cancel(canceledAt: Date, now: Date) {
    if (this.status === "CLOSED") {
      throw new Error("Closed purchase orders cannot be canceled");
    }
    this.status = "CANCELED";
    this.canceledAt = canceledAt;
    this.touch(now);
  }

  private ensureDraft() {
    if (this.status !== "DRAFT") {
      throw new Error("Purchase order is not editable unless in draft");
    }
  }

  private recalculateTotals() {
    this.totals = calculatePurchaseOrderTotals(this.lineItems);
  }

  private touch(now: Date) {
    this.updatedAt = now;
  }
}
