import type {
  IdempotencyStoragePort,
  StoredResponse,
} from "../../../../shared/ports/idempotency-storage.port";

export const getIdempotentResult = async <T>(params: {
  idempotency: IdempotencyStoragePort;
  actionKey: string;
  tenantId: string;
  idempotencyKey?: string;
}): Promise<T | null> => {
  const { idempotency, actionKey, tenantId, idempotencyKey } = params;
  if (!idempotencyKey) {
    return null;
  }
  const cached = await idempotency.get(actionKey, tenantId, idempotencyKey);
  return cached ? (cached.body as T) : null;
};

export const storeIdempotentResult = async <T>(params: {
  idempotency: IdempotencyStoragePort;
  actionKey: string;
  tenantId: string;
  idempotencyKey?: string;
  body: T;
  statusCode?: number;
}): Promise<void> => {
  const { idempotency, actionKey, tenantId, idempotencyKey, body, statusCode } = params;
  if (!idempotencyKey) {
    return;
  }
  const response: StoredResponse = { statusCode: statusCode ?? 200, body };
  await idempotency.store(actionKey, tenantId, idempotencyKey, response);
};
