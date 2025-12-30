import { type CustomerBillingSnapshotDTO } from "@corely/contracts";

export interface CustomerQueryPort {
  getCustomerBillingSnapshot(
    tenantId: string,
    partyId: string
  ): Promise<CustomerBillingSnapshotDTO | null>;
}

export const CUSTOMER_QUERY_PORT = "invoices/customer-query";
