import { type PartyAggregate } from "../../domain/party.aggregate";

export type ListCustomersFilters = {
  includeArchived?: boolean;
};

export type Pagination = {
  pageSize?: number;
  cursor?: string;
};

export type ListCustomersResult = {
  items: PartyAggregate[];
  nextCursor?: string | null;
};

export interface PartyRepoPort {
  createCustomer(tenantId: string, party: PartyAggregate): Promise<void>;
  updateCustomer(tenantId: string, party: PartyAggregate): Promise<void>;
  findCustomerById(tenantId: string, partyId: string): Promise<PartyAggregate | null>;
  listCustomers(
    tenantId: string,
    filters: ListCustomersFilters,
    pagination: Pagination
  ): Promise<ListCustomersResult>;
  searchCustomers(
    tenantId: string,
    q: string | undefined,
    pagination: Pagination
  ): Promise<ListCustomersResult>;
}
