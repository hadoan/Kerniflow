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

  export interface ValidationErrorItem {
    message: string;
    members: string[];
  }

  export class ApiError extends Error {
    readonly status: number;
    readonly code: string;
    readonly detail: string;
    readonly validationErrors?: ValidationErrorItem[];
    readonly traceId?: string;
    readonly data?: Record<string, unknown>;
    readonly originalError?: HttpError;
    readonly isNetworkError: boolean;

    constructor(options: {
      status: number;
      code: string;
      detail: string;
      message?: string;
      validationErrors?: ValidationErrorItem[];
      traceId?: string;
      data?: Record<string, unknown>;
      originalError?: HttpError;
      isNetworkError?: boolean;
    });

    isValidationError(): boolean;
    isUnauthorized(): boolean;
    isForbidden(): boolean;
    isNotFound(): boolean;
    isConflict(): boolean;
    isServerError(): boolean;
    isRetryable(): boolean;
  }
  export function normalizeError(error: unknown): ApiError;
}

declare module "@corely/auth-client" {
  export interface SignUpData {
    email: string;
    password: string;
    tenantName: string;
    userName?: string;
  }

  export interface SignInData {
    email: string;
    password: string;
    tenantId?: string;
    workspaceId?: string;
  }

  export interface AuthResponse {
    accessToken: string;
    refreshToken: string;
    userId: string;
    email: string;
    tenantId?: string;
    tenantName?: string;
    workspaceId?: string;
  }

  export interface CurrentUserResponse {
    userId: string;
    email: string;
    name: string | null;
    activeTenantId?: string;
    activeWorkspaceId?: string;
    memberships: Array<{
      tenantId?: string;
      tenantName?: string;
      workspaceId?: string;
      workspaceName?: string;
      roleId: string;
    }>;
  }

  export interface TokenStorage {
    setAccessToken(token: string): Promise<void>;
    getAccessToken(): Promise<string | null>;
    setRefreshToken(token: string): Promise<void>;
    getRefreshToken(): Promise<string | null>;
    setActiveWorkspaceId(workspaceId: string): Promise<void>;
    getActiveWorkspaceId(): Promise<string | null>;
    clear(): Promise<void>;
  }

  export interface AuthClientConfig {
    apiUrl: string;
    storage: TokenStorage;
  }

  export class AuthClient {
    constructor(config: AuthClientConfig);
    loadStoredTokens(): Promise<void>;
    clearTokens(): Promise<void>;
    getAccessToken(): string | null;
    getRefreshToken(): string | null;
    signup(data: SignUpData): Promise<AuthResponse>;
    signin(data: SignInData): Promise<AuthResponse>;
    getCurrentUser(): Promise<CurrentUserResponse>;
    refreshAccessToken(): Promise<void>;
    signout(): Promise<void>;
    switchTenant(tenantId: string): Promise<AuthResponse>;
  }
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
