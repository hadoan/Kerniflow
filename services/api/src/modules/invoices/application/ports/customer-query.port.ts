import { CustomerBillingSnapshotDTO } from "@kerniflow/contracts";

export interface CustomerQueryPort {
  getCustomerBillingSnapshot(
    tenantId: string,
    partyId: string
  ): Promise<CustomerBillingSnapshotDTO | null>;
}

export const CUSTOMER_QUERY_PORT = Symbol("CUSTOMER_QUERY_PORT");
