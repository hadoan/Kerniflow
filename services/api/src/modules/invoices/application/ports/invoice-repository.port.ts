import { type InvoiceAggregate } from "../../domain/invoice.aggregate";
import { type InvoiceStatus } from "../../domain/invoice.types";

export type ListInvoicesFilters = {
  status?: InvoiceStatus;
  customerPartyId?: string;
  fromDate?: Date;
  toDate?: Date;
};

export type ListInvoicesResult = {
  items: InvoiceAggregate[];
  nextCursor?: string | null;
};

export interface InvoiceRepoPort {
  findById(tenantId: string, invoiceId: string): Promise<InvoiceAggregate | null>;
  list(
    tenantId: string,
    filters: ListInvoicesFilters,
    pageSize?: number,
    cursor?: string
  ): Promise<ListInvoicesResult>;
  save(tenantId: string, invoice: InvoiceAggregate): Promise<void>;
  create(tenantId: string, invoice: InvoiceAggregate): Promise<void>;
  isInvoiceNumberTaken(tenantId: string, number: string): Promise<boolean>;
}
