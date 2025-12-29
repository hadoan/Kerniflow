import { SalesOrderAggregate } from "../../domain/order.aggregate";
import { OrderStatus } from "../../domain/sales.types";

export type ListOrdersFilters = {
  status?: OrderStatus;
  customerPartyId?: string;
  fromDate?: Date;
  toDate?: Date;
};

export type ListOrdersResult = {
  items: SalesOrderAggregate[];
  nextCursor?: string | null;
};

export interface SalesOrderRepositoryPort {
  findById(tenantId: string, orderId: string): Promise<SalesOrderAggregate | null>;
  list(
    tenantId: string,
    filters: ListOrdersFilters,
    pageSize?: number,
    cursor?: string
  ): Promise<ListOrdersResult>;
  save(tenantId: string, order: SalesOrderAggregate): Promise<void>;
  create(tenantId: string, order: SalesOrderAggregate): Promise<void>;
  isOrderNumberTaken(tenantId: string, number: string): Promise<boolean>;
}

export const SALES_ORDER_REPOSITORY_PORT = Symbol("SALES_ORDER_REPOSITORY_PORT");
