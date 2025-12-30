import { type LocalDate } from "@corely/kernel";
import {
  type InvoiceLine,
  type InvoicePayment,
  type InvoiceStatus,
  type InvoiceTotals,
  type PdfStatus,
} from "./invoice.types";

type BillToSnapshot = {
  name: string;
  email?: string | null;
  vatId?: string | null;
  address?: {
    line1: string;
    line2?: string | null;
    city?: string | null;
    postalCode?: string | null;
    country?: string | null;
  };
};

type InvoiceProps = {
  id: string;
  tenantId: string;
  customerPartyId: string;
  currency: string;
  notes?: string | null;
  terms?: string | null;
  number?: string | null;
  status: InvoiceStatus;
  invoiceDate?: LocalDate | null;
  dueDate?: LocalDate | null;
  lineItems: InvoiceLine[];
  payments: InvoicePayment[];
  issuedAt?: Date | null;
  sentAt?: Date | null;
  billToName?: string | null;
  billToEmail?: string | null;
  billToVatId?: string | null;
  billToAddressLine1?: string | null;
  billToAddressLine2?: string | null;
  billToCity?: string | null;
  billToPostalCode?: string | null;
  billToCountry?: string | null;
  createdAt: Date;
  updatedAt: Date;
  pdfStorageKey?: string | null;
  pdfGeneratedAt?: Date | null;
  pdfSourceVersion?: string | null;
  pdfStatus?: PdfStatus;
  pdfFailureReason?: string | null;
};

export class InvoiceAggregate {
  id: string;
  tenantId: string;
  customerPartyId: string;
  currency: string;
  notes?: string | null;
  terms?: string | null;
  number: string | null;
  status: InvoiceStatus;
  invoiceDate: LocalDate | null;
  dueDate: LocalDate | null;
  lineItems: InvoiceLine[];
  payments: InvoicePayment[];
  issuedAt: Date | null;
  sentAt: Date | null;
  billToName: string | null;
  billToEmail: string | null;
  billToVatId: string | null;
  billToAddressLine1: string | null;
  billToAddressLine2: string | null;
  billToCity: string | null;
  billToPostalCode: string | null;
  billToCountry: string | null;
  createdAt: Date;
  updatedAt: Date;
  pdfStorageKey: string | null;
  pdfGeneratedAt: Date | null;
  pdfSourceVersion: string | null;
  pdfStatus: PdfStatus;
  pdfFailureReason: string | null;
  totals: InvoiceTotals;

  constructor(props: InvoiceProps) {
    this.id = props.id;
    this.tenantId = props.tenantId;
    this.customerPartyId = props.customerPartyId;
    this.currency = props.currency;
    this.notes = props.notes ?? null;
    this.terms = props.terms ?? null;
    this.number = props.number ?? null;
    this.status = props.status;
    this.invoiceDate = props.invoiceDate ?? null;
    this.dueDate = props.dueDate ?? null;
    this.lineItems = props.lineItems;
    this.payments = props.payments;
    this.issuedAt = props.issuedAt ?? null;
    this.sentAt = props.sentAt ?? null;
    this.billToName = props.billToName ?? null;
    this.billToEmail = props.billToEmail ?? null;
    this.billToVatId = props.billToVatId ?? null;
    this.billToAddressLine1 = props.billToAddressLine1 ?? null;
    this.billToAddressLine2 = props.billToAddressLine2 ?? null;
    this.billToCity = props.billToCity ?? null;
    this.billToPostalCode = props.billToPostalCode ?? null;
    this.billToCountry = props.billToCountry ?? null;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
    this.pdfStorageKey = props.pdfStorageKey ?? null;
    this.pdfGeneratedAt = props.pdfGeneratedAt ?? null;
    this.pdfSourceVersion = props.pdfSourceVersion ?? null;
    this.pdfStatus = props.pdfStatus ?? "NONE";
    this.pdfFailureReason = props.pdfFailureReason ?? null;
    this.totals = this.calculateTotals();
  }

  static createDraft(params: {
    id: string;
    tenantId: string;
    customerPartyId: string;
    currency: string;
    notes?: string;
    terms?: string;
    invoiceDate?: LocalDate | null;
    dueDate?: LocalDate | null;
    lineItems: InvoiceLine[];
    createdAt: Date;
    billToSnapshot?: BillToSnapshot | null;
  }) {
    const aggregate = new InvoiceAggregate({
      ...params,
      status: "DRAFT",
      invoiceDate: params.invoiceDate ?? null,
      dueDate: params.dueDate ?? null,
      number: null,
      payments: [],
      issuedAt: null,
      sentAt: null,
      updatedAt: params.createdAt,
    });
    if (params.billToSnapshot) {
      aggregate.setBillToSnapshot(params.billToSnapshot);
    }
    return aggregate;
  }

  updateHeader(
    patch: Partial<Pick<InvoiceProps, "customerPartyId" | "currency" | "notes" | "terms">>,
    now: Date
  ) {
    const allowedAfterDraft = ["notes", "terms"];
    if (this.status !== "DRAFT") {
      const disallowedPatch = Object.keys(patch).some((k) => !allowedAfterDraft.includes(k));
      if (disallowedPatch) {
        throw new Error("Cannot update invoice header after finalize");
      }
    }

    if (patch.customerPartyId !== undefined) {
      this.customerPartyId = patch.customerPartyId;
    }
    if (patch.currency !== undefined) {
      this.currency = patch.currency;
    }
    if (patch.notes !== undefined) {
      this.notes = patch.notes;
    }
    if (patch.terms !== undefined) {
      this.terms = patch.terms;
    }
    this.touch(now);
  }

  updateDates(dates: { invoiceDate?: LocalDate | null; dueDate?: LocalDate | null }, now: Date) {
    if (this.status !== "DRAFT") {
      throw new Error("Cannot change invoice dates unless draft");
    }
    if (dates.invoiceDate !== undefined) {
      this.invoiceDate = dates.invoiceDate;
    }
    if (dates.dueDate !== undefined) {
      this.dueDate = dates.dueDate;
    }
    this.touch(now);
  }

  replaceLineItems(lineItems: InvoiceLine[], now: Date) {
    if (this.status !== "DRAFT") {
      throw new Error("Cannot change line items unless draft");
    }
    this.lineItems = lineItems;
    this.recalculateTotals();
    this.touch(now);
  }

  finalize(number: string, issuedAt: Date, now: Date, billTo: BillToSnapshot) {
    if (this.status !== "DRAFT") {
      throw new Error("Only draft invoices can be finalized");
    }
    if (!this.customerPartyId) {
      throw new Error("Customer is required to finalize");
    }
    if (!this.lineItems.length) {
      throw new Error("At least one line item is required to finalize");
    }
    if (!billTo.name.trim()) {
      throw new Error("Bill-to name is required to finalize");
    }

    this.setBillToSnapshot(billTo);
    this.status = "ISSUED";
    this.number = number;
    this.issuedAt = issuedAt;
    this.touch(now);
  }

  markSent(sentAt: Date, now: Date) {
    if (this.status !== "ISSUED" && this.status !== "SENT") {
      throw new Error("Only issued invoices can be sent");
    }
    this.status = "SENT";
    this.sentAt = sentAt;
    this.touch(now);
  }

  recordPayment(payment: InvoicePayment, now: Date) {
    if (this.status === "CANCELED") {
      throw new Error("Cannot record payment on canceled invoice");
    }
    if (this.status === "DRAFT") {
      throw new Error("Cannot record payment on draft invoice");
    }
    this.payments.push(payment);
    this.recalculateTotals();
    if (this.totals.paidCents >= this.totals.totalCents) {
      this.status = "PAID";
    }
    this.touch(now);
  }

  cancel(reason: string | undefined, canceledAt: Date | undefined, now: Date) {
    if (this.status === "PAID") {
      throw new Error("Cannot cancel a paid invoice");
    }
    if (this.status === "CANCELED") {
      return;
    }
    this.status = "CANCELED";
    this.notes = reason ?? this.notes ?? null;
    this.sentAt = canceledAt ?? this.sentAt;
    this.touch(now);
  }

  setBillToSnapshot(snapshot: BillToSnapshot) {
    this.billToName = snapshot.name;
    this.billToEmail = snapshot.email ?? null;
    this.billToVatId = snapshot.vatId ?? null;
    this.billToAddressLine1 = snapshot.address?.line1 ?? null;
    this.billToAddressLine2 = snapshot.address?.line2 ?? null;
    this.billToCity = snapshot.address?.city ?? null;
    this.billToPostalCode = snapshot.address?.postalCode ?? null;
    this.billToCountry = snapshot.address?.country ?? null;
  }

  private calculateTotals(): InvoiceTotals {
    const subtotal = this.lineItems.reduce((sum, line) => sum + line.qty * line.unitPriceCents, 0);
    const taxCents = 0;
    const discountCents = 0;
    const totalCents = subtotal + taxCents - discountCents;
    const paidCents = this.payments.reduce((sum, p) => sum + p.amountCents, 0);
    const dueCents = Math.max(totalCents - paidCents, 0);
    return {
      subtotalCents: subtotal,
      taxCents,
      discountCents,
      totalCents,
      paidCents,
      dueCents,
    };
  }

  private recalculateTotals() {
    this.totals = this.calculateTotals();
  }

  markPdfGenerated(args: {
    storageKey: string;
    generatedAt: Date;
    sourceVersion: string;
    now: Date;
  }) {
    this.pdfStorageKey = args.storageKey;
    this.pdfGeneratedAt = args.generatedAt;
    this.pdfSourceVersion = args.sourceVersion;
    this.pdfStatus = "READY";
    this.pdfFailureReason = null;
    this.touch(args.now);
  }

  markPdfGenerating(sourceVersion: string, now: Date) {
    this.pdfSourceVersion = sourceVersion;
    this.pdfStatus = "GENERATING";
    this.pdfFailureReason = null;
    this.touch(now);
  }

  markPdfFailed(reason: string, now: Date) {
    this.pdfStatus = "FAILED";
    this.pdfFailureReason = reason;
    this.touch(now);
  }

  isPdfStale(): boolean {
    if (!this.pdfStorageKey || !this.pdfSourceVersion) {
      return true;
    }
    return this.pdfSourceVersion !== this.updatedAt.toISOString();
  }

  isPdfReady(): boolean {
    return this.pdfStatus === "READY" && !this.isPdfStale();
  }

  private touch(now: Date) {
    this.updatedAt = now;
  }
}
