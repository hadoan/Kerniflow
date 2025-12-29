import { ApiClient, type ApiClientConfig } from "@kerniflow/auth-client";
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
} from "@kerniflow/contracts";

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
    if (input.status) params.append("status", input.status);
    const query = params.toString();

    return this.get<ListRegistersOutput>(`/pos/registers${query ? `?${query}` : ""}`);
  }

  // Shift management
  async openShift(input: OpenShiftInput): Promise<OpenShiftOutput> {
    return this.post<OpenShiftOutput>(
      "/pos/shifts/open",
      input,
      { idempotencyKey: this.generateIdempotencyKey() }
    );
  }

  async closeShift(input: CloseShiftInput): Promise<CloseShiftOutput> {
    return this.post<CloseShiftOutput>(
      "/pos/shifts/close",
      input,
      { idempotencyKey: this.generateIdempotencyKey() }
    );
  }

  async getCurrentShift(input: GetCurrentShiftInput): Promise<GetCurrentShiftOutput> {
    const params = new URLSearchParams({
      registerId: input.registerId,
    });

    return this.get<GetCurrentShiftOutput>(`/pos/shifts/current?${params.toString()}`);
  }

  // Sales sync
  async syncPosSale(input: SyncPosSaleInput): Promise<SyncPosSaleOutput> {
    return this.post<SyncPosSaleOutput>(
      "/pos/sales/sync",
      input,
      { idempotencyKey: input.idempotencyKey }
    );
  }

  // Catalog
  async getCatalogSnapshot(
    input: GetCatalogSnapshotInput
  ): Promise<GetCatalogSnapshotOutput> {
    const params = new URLSearchParams();
    if (input.lastSyncAt) {
      params.append("lastSyncAt", input.lastSyncAt.toISOString());
    }

    return this.get<GetCatalogSnapshotOutput>(
      `/pos/catalog/snapshot${params.toString() ? `?${params.toString()}` : ""}`
    );
  }
}
