import { type InvoiceLine } from "./invoice-line.entity";

export type InvoiceStatus = "DRAFT" | "ISSUED" | "PAID";

export class Invoice {
  public issuedAt: Date | null;

  constructor(
    public readonly id: string,
    public readonly tenantId: string,
    public status: InvoiceStatus,
    public totalCents: number,
    public currency: string,
    public clientId: string | null,
    public lines: InvoiceLine[],
    issuedAt?: Date | null,
    public custom: Record<string, unknown> | null = null
  ) {
    this.issuedAt = issuedAt ?? null;
  }

  issue(at: Date) {
    if (this.status !== "DRAFT") {
      throw new Error("Only draft invoices can be issued");
    }
    this.status = "ISSUED";
    this.issuedAt = at;
  }

  markPaid(at: Date) {
    if (this.status === "PAID") {
      return;
    }
    if (this.status === "DRAFT") {
      throw new Error("Draft invoices cannot be marked as paid");
    }
    this.status = "PAID";
    this.issuedAt = this.issuedAt ?? at;
  }

  replaceLines(lines: InvoiceLine[]) {
    this.lines = lines;
    this.recalculateTotal();
  }

  updateDetails(details: {
    currency?: string;
    clientId?: string | null;
    custom?: Record<string, unknown> | null;
  }) {
    if (details.currency !== undefined) {
      this.currency = details.currency;
    }
    if (details.clientId !== undefined) {
      this.clientId = details.clientId;
    }
    if (details.custom !== undefined) {
      this.custom = details.custom;
    }
  }

  recalculateTotal() {
    this.totalCents = this.lines.reduce((sum, line) => sum + line.lineTotal, 0);
  }
}
