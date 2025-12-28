import {
  type InvoiceRepoPort,
  type ListInvoicesFilters,
  type ListInvoicesResult,
} from "../../application/ports/invoice-repository.port";
import { type InvoiceAggregate } from "../../domain/invoice.aggregate";

export class FakeInvoiceRepository implements InvoiceRepoPort {
  invoices: InvoiceAggregate[] = [];

  async save(tenantId: string, invoice: InvoiceAggregate): Promise<void> {
    if (tenantId !== invoice.tenantId) {
      throw new Error("Tenant mismatch when saving invoice");
    }
    const index = this.invoices.findIndex(
      (i) => i.id === invoice.id && i.tenantId === invoice.tenantId
    );
    if (index >= 0) {
      this.invoices[index] = invoice;
    } else {
      this.invoices.push(invoice);
    }
  }

  async create(tenantId: string, invoice: InvoiceAggregate): Promise<void> {
    return this.save(tenantId, invoice);
  }

  async findById(tenantId: string, id: string): Promise<InvoiceAggregate | null> {
    return this.invoices.find((i) => i.id === id && i.tenantId === tenantId) ?? null;
  }

  async list(
    tenantId: string,
    filters: ListInvoicesFilters,
    pageSize = 20,
    cursor?: string
  ): Promise<ListInvoicesResult> {
    const startIndex = cursor ? this.invoices.findIndex((i) => i.id === cursor) + 1 : 0;
    let items = this.invoices.filter((i) => i.tenantId === tenantId);
    if (filters.status) {
      items = items.filter((i) => i.status === filters.status);
    }
    if (filters.customerPartyId) {
      items = items.filter((i) => i.customerPartyId === filters.customerPartyId);
    }
    if (filters.fromDate) {
      items = items.filter((i) => i.createdAt >= filters.fromDate!);
    }
    if (filters.toDate) {
      items = items.filter((i) => i.createdAt <= filters.toDate!);
    }

    const slice = items.slice(startIndex, startIndex + pageSize);
    const nextCursor = slice.length === pageSize ? slice[slice.length - 1].id : null;
    return { items: slice, nextCursor };
  }

  async isInvoiceNumberTaken(tenantId: string, number: string): Promise<boolean> {
    return this.invoices.some((i) => i.tenantId === tenantId && i.number === number);
  }
}
