export interface StoredResponse {
  statusCode?: number;
  body: any;
}

export interface IdempotencyStoragePort {
  get(actionKey: string, tenantId: string | null, key: string): Promise<StoredResponse | null>;
  store(
    actionKey: string,
    tenantId: string | null,
    key: string,
    response: StoredResponse
  ): Promise<void>;
}

export const IDEMPOTENCY_STORAGE_PORT_TOKEN = "api/idempotency-storage-port";
