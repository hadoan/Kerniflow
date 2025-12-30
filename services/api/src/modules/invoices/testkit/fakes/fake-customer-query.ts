import { type CustomerBillingSnapshotDTO } from "@corely/contracts";
import { type CustomerQueryPort } from "../../application/ports/customer-query.port";

export class FakeCustomerQueryPort implements CustomerQueryPort {
  snapshots: Record<string, CustomerBillingSnapshotDTO> = {};

  setSnapshot(tenantId: string, snapshot: CustomerBillingSnapshotDTO) {
    this.snapshots[`${tenantId}:${snapshot.partyId}`] = snapshot;
  }

  async getCustomerBillingSnapshot(
    tenantId: string,
    partyId: string
  ): Promise<CustomerBillingSnapshotDTO | null> {
    return this.snapshots[`${tenantId}:${partyId}`] ?? null;
  }
}
