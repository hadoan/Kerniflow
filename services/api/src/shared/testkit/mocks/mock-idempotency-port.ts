import {
  type IdempotencyStoragePort,
  type StoredResponse,
} from "../../ports/idempotency-storage.port";

export class MockIdempotencyStoragePort implements IdempotencyStoragePort {
  private readonly records = new Map<string, StoredResponse>();

  async get(
    actionKey: string,
    tenantId: string | null,
    key: string
  ): Promise<StoredResponse | null> {
    return this.records.get(this.buildKey(actionKey, tenantId, key)) ?? null;
  }

  async store(
    actionKey: string,
    tenantId: string | null,
    key: string,
    response: StoredResponse
  ): Promise<void> {
    this.records.set(this.buildKey(actionKey, tenantId, key), response);
  }

  private buildKey(actionKey: string, tenantId: string | null, key: string) {
    return `${tenantId ?? "public"}:${actionKey}:${key}`;
  }
}
