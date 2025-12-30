import { ApiClient, type ApiClientConfig } from "@corely/auth-client";
import type {
  CreateRegisterInput,
  CreateRegisterOutput,
  ListRegistersInput,
  ListRegistersOutput,
  OpenShiftInput,
  OpenShiftOutput,
  CloseShiftInput,
  CloseShiftOutput,
  GetCurrentShiftInput,
  GetCurrentShiftOutput,
  SyncPosSaleInput,
  SyncPosSaleOutput,
  GetCatalogSnapshotInput,
  GetCatalogSnapshotOutput,
  SearchCustomersInput,
  SearchCustomersOutput,
  GetCustomerInput,
  CustomerDto,
  CreateCheckInEventInput,
  CreateCheckInEventOutput,
  ListCheckInEventsInput,
  ListCheckInEventsOutput,
  GetLoyaltySummaryInput,
  GetLoyaltySummaryOutput,
  CreateLoyaltyEarnEntryInput,
  CreateLoyaltyEarnEntryOutput,
  ListLoyaltyLedgerInput,
  ListLoyaltyLedgerOutput,
  GetEngagementSettingsInput,
  GetEngagementSettingsOutput,
  UpdateEngagementSettingsInput,
  UpdateEngagementSettingsOutput,
} from "@corely/contracts";

/**
 * POS API Client
 * Extends shared ApiClient with POS-specific methods
 */
export class PosApiClient extends ApiClient {
  constructor(config: ApiClientConfig) {
    super(config);
  }
  // Register management
  async createRegister(input: CreateRegisterInput): Promise<CreateRegisterOutput> {
    return this.post<CreateRegisterOutput>("/pos/registers", input);
  }

  async listRegisters(input: ListRegistersInput): Promise<ListRegistersOutput> {
    const params = new URLSearchParams();
    if (input.status) {
      params.append("status", input.status);
    }
    const query = params.toString();

    return this.get<ListRegistersOutput>(`/pos/registers${query ? `?${query}` : ""}`);
  }

  // Shift management
  async openShift(input: OpenShiftInput): Promise<OpenShiftOutput> {
    return this.post<OpenShiftOutput>("/pos/shifts/open", input, {
      idempotencyKey: this.generateIdempotencyKey(),
    });
  }

  async closeShift(input: CloseShiftInput): Promise<CloseShiftOutput> {
    return this.post<CloseShiftOutput>("/pos/shifts/close", input, {
      idempotencyKey: this.generateIdempotencyKey(),
    });
  }

  async getCurrentShift(input: GetCurrentShiftInput): Promise<GetCurrentShiftOutput> {
    const params = new URLSearchParams({
      registerId: input.registerId,
    });

    return this.get<GetCurrentShiftOutput>(`/pos/shifts/current?${params.toString()}`);
  }

  // Sales sync
  async syncPosSale(input: SyncPosSaleInput): Promise<SyncPosSaleOutput> {
    return this.post<SyncPosSaleOutput>("/pos/sales/sync", input, {
      idempotencyKey: input.idempotencyKey,
    });
  }

  // Catalog
  async getCatalogSnapshot(input: GetCatalogSnapshotInput): Promise<GetCatalogSnapshotOutput> {
    const params = new URLSearchParams();
    if (input.lastSyncAt) {
      params.append("lastSyncAt", input.lastSyncAt.toISOString());
    }

    return this.get<GetCatalogSnapshotOutput>(
      `/pos/catalog/snapshot${params.toString() ? `?${params.toString()}` : ""}`
    );
  }

  // Customers
  async searchCustomers(input: SearchCustomersInput): Promise<SearchCustomersOutput> {
    const params = new URLSearchParams({ q: input.q });
    if (input.cursor) {
      params.append("cursor", input.cursor);
    }
    if (input.pageSize) {
      params.append("pageSize", String(input.pageSize));
    }
    return this.get<SearchCustomersOutput>(`/customers/search?${params.toString()}`);
  }

  async getCustomer(input: GetCustomerInput): Promise<CustomerDto> {
    return this.get<CustomerDto>(`/customers/${input.id}`);
  }

  // Engagement
  async createCheckIn(
    input: CreateCheckInEventInput,
    idempotencyKey: string
  ): Promise<CreateCheckInEventOutput> {
    return this.post<CreateCheckInEventOutput>("/engagement/checkins", input, {
      idempotencyKey,
    });
  }

  async listCheckIns(input: ListCheckInEventsInput): Promise<ListCheckInEventsOutput> {
    const params = new URLSearchParams();
    if (input.customerPartyId) {
      params.append("customerPartyId", input.customerPartyId);
    }
    if (input.registerId) {
      params.append("registerId", input.registerId);
    }
    if (input.status) {
      params.append("status", input.status);
    }
    if (input.from) {
      params.append("from", input.from.toISOString());
    }
    if (input.to) {
      params.append("to", input.to.toISOString());
    }
    if (input.cursor) {
      params.append("cursor", input.cursor);
    }
    if (input.pageSize) {
      params.append("pageSize", String(input.pageSize));
    }
    return this.get<ListCheckInEventsOutput>(
      `/engagement/checkins${params.toString() ? `?${params.toString()}` : ""}`
    );
  }

  async getLoyaltySummary(input: GetLoyaltySummaryInput): Promise<GetLoyaltySummaryOutput> {
    return this.get<GetLoyaltySummaryOutput>(`/engagement/loyalty/${input.customerPartyId}`);
  }

  async listLoyaltyLedger(input: ListLoyaltyLedgerInput): Promise<ListLoyaltyLedgerOutput> {
    const params = new URLSearchParams();
    if (input.cursor) {
      params.append("cursor", input.cursor);
    }
    if (input.pageSize) {
      params.append("pageSize", String(input.pageSize));
    }
    return this.get<ListLoyaltyLedgerOutput>(
      `/engagement/loyalty/${input.customerPartyId}/ledger${
        params.toString() ? `?${params.toString()}` : ""
      }`
    );
  }

  async createLoyaltyEarn(
    input: CreateLoyaltyEarnEntryInput,
    idempotencyKey: string
  ): Promise<CreateLoyaltyEarnEntryOutput> {
    return this.post<CreateLoyaltyEarnEntryOutput>("/engagement/loyalty/earn", input, {
      idempotencyKey,
    });
  }

  async getEngagementSettings(
    input: GetEngagementSettingsInput
  ): Promise<GetEngagementSettingsOutput> {
    return this.get<GetEngagementSettingsOutput>("/engagement/settings");
  }

  async updateEngagementSettings(
    input: UpdateEngagementSettingsInput
  ): Promise<UpdateEngagementSettingsOutput> {
    return this.patch<UpdateEngagementSettingsOutput>("/engagement/settings", input);
  }
}
