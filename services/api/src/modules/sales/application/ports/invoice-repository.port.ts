import { SalesInvoiceAggregate } from "../../domain/invoice.aggregate";
import { SalesInvoiceStatus } from "../../domain/sales.types";

export type ListSalesInvoicesFilters = {
  status?: SalesInvoiceStatus;
  customerPartyId?: string;
  fromDate?: Date;
  toDate?: Date;
};

export type ListSalesInvoicesResult = {
  items: SalesInvoiceAggregate[];
  nextCursor?: string | null;
};

export interface SalesInvoiceRepositoryPort {
  findById(tenantId: string, invoiceId: string): Promise<SalesInvoiceAggregate | null>;
  list(
    tenantId: string,
    filters: ListSalesInvoicesFilters,
    pageSize?: number,
    cursor?: string
  ): Promise<ListSalesInvoicesResult>;
  save(tenantId: string, invoice: SalesInvoiceAggregate): Promise<void>;
  create(tenantId: string, invoice: SalesInvoiceAggregate): Promise<void>;
  isInvoiceNumberTaken(tenantId: string, number: string): Promise<boolean>;
}

export const SALES_INVOICE_REPOSITORY_PORT = Symbol("SALES_INVOICE_REPOSITORY_PORT");
