declare module "@corely/api-client" {
  import type {
    RetryPolicyOptions,
    RetryableResult,
  } from "../../../packages/api-client/src/retry/retryPolicy";
  export const defaultRetryPolicy: RetryPolicyOptions;
  export function computeBackoffDelayMs(attempt: number, opts: RetryPolicyOptions): number;
  export function shouldRetry(
    attempt: number,
    result: RetryableResult,
    maxAttempts?: number
  ): boolean;
  export function getRetryAfterMs(response?: Response): number | null;
  export function request<T>(opts: any): Promise<T>;
  export class HttpError extends Error {
    constructor(message: string, status: number | null, body?: unknown);
    status: number | null;
    body?: unknown;
  }
  export function createIdempotencyKey(): string;
}

declare module "@corely/offline-core" {
  export type { Clock } from "../../../packages/offline-core/src/platform/clock.port";
  export type { IdGenerator } from "../../../packages/offline-core/src/platform/idGenerator.port";
  export type { Logger } from "../../../packages/offline-core/src/platform/logger.port";
  export type { SyncTransport } from "../../../packages/offline-core/src/sync/syncTransport.port";
  export { SyncEngine } from "../../../packages/offline-core/src/sync/syncEngine";
  export * from "../../../packages/offline-core/src/sync/backoff";
  export * from "../../../packages/offline-core/src/outbox/outboxStore.port";
  export * from "../../../packages/offline-core/src/outbox/outboxTypes";
}

declare module "@corely/offline-web" {
  export { LocalStorageSyncLock } from "../../../packages/offline-web/src/locks/localStorageSyncLock";
  export { IndexedDbOutboxStore } from "../../../packages/offline-web/src/outbox/indexeddbOutboxStore";
  export { WebNetworkMonitor } from "../../../packages/offline-web/src/network/webNetworkMonitor";
  export { createIndexedDbPersister } from "../../../packages/offline-web/src/persist/indexedDbPersister";
}
