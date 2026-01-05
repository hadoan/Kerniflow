import { request, createIdempotencyKey, HttpError } from "@corely/api-client";
import type { AuthClient } from "./auth-client";
import type { TokenStorage } from "./storage/storage.interface";

export interface ApiClientConfig {
  apiUrl: string;
  authClient: AuthClient;
  storage: TokenStorage;
  onAuthError?: () => void;
}

export class ApiClient {
  private apiUrl: string;
  private authClient: AuthClient;
  private storage: TokenStorage;
  private onAuthError: (() => void) | undefined;
  private isRefreshing = false;
  private refreshPromise: Promise<void> | null = null;

  constructor(config: ApiClientConfig) {
    this.apiUrl = config.apiUrl;
    this.authClient = config.authClient;
    this.storage = config.storage;
    this.onAuthError = config.onAuthError;
  }

  generateIdempotencyKey(): string {
    return createIdempotencyKey();
  }

  generateCorrelationId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(7)}`;
  }

  async request<T>(
    endpoint: string,
    options: RequestInit = {},
    opts?: {
      idempotencyKey?: string;
      correlationId?: string;
      skipTokenRefresh?: boolean;
    }
  ): Promise<T> {
    const accessToken = this.authClient.getAccessToken();
    const workspaceId = await this.storage.getActiveWorkspaceId();

    try {
      return await request<T>({
        url: `${this.apiUrl}${endpoint}`,
        method: options.method ?? "GET",
        headers: options.headers,
        body: options.body as BodyInit | null | undefined,
        accessToken,
        workspaceId: workspaceId ?? null,
        idempotencyKey: opts?.idempotencyKey,
        correlationId: opts?.correlationId,
      });
    } catch (error) {
      // If we get a 401 and haven't already tried refreshing, attempt token refresh
      if (
        error instanceof HttpError &&
        error.status === 401 &&
        !opts?.skipTokenRefresh &&
        this.authClient.getAccessToken()
      ) {
        // If another request is already refreshing, wait for it
        if (this.isRefreshing && this.refreshPromise) {
          await this.refreshPromise;
        } else {
          // Start refreshing
          this.isRefreshing = true;
          this.refreshPromise = this.authClient
            .refreshAccessToken()
            .catch((refreshError) => {
              // If refresh fails, clear tokens and call auth error handler
              void this.authClient.clearTokens();
              if (this.onAuthError) {
                this.onAuthError();
              }
              throw refreshError;
            })
            .finally(() => {
              this.isRefreshing = false;
              this.refreshPromise = null;
            });

          await this.refreshPromise;
        }

        // Retry the request with the new token
        return this.request<T>(endpoint, options, {
          ...opts,
          skipTokenRefresh: true, // Prevent infinite loops
        });
      }

      throw error;
    }
  }

  async get<T>(endpoint: string, opts?: { correlationId?: string }): Promise<T> {
    return this.request<T>(endpoint, { method: "GET" }, opts);
  }

  async post<T>(
    endpoint: string,
    body?: unknown,
    opts?: { idempotencyKey?: string; correlationId?: string }
  ): Promise<T> {
    const requestInit: RequestInit = { method: "POST" };
    if (body !== undefined) {
      requestInit.body = body as BodyInit | null;
    }
    return this.request<T>(endpoint, requestInit, opts);
  }

  async put<T>(
    endpoint: string,
    body?: unknown,
    opts?: { idempotencyKey?: string; correlationId?: string }
  ): Promise<T> {
    const requestInit: RequestInit = { method: "PUT" };
    if (body !== undefined) {
      requestInit.body = body as BodyInit | null;
    }
    return this.request<T>(endpoint, requestInit, opts);
  }

  async patch<T>(
    endpoint: string,
    body?: unknown,
    opts?: { idempotencyKey?: string; correlationId?: string }
  ): Promise<T> {
    const requestInit: RequestInit = { method: "PATCH" };
    if (body !== undefined) {
      requestInit.body = body as BodyInit | null;
    }
    return this.request<T>(endpoint, requestInit, opts);
  }

  async delete<T>(endpoint: string, opts?: { correlationId?: string }): Promise<T> {
    return this.request<T>(endpoint, { method: "DELETE" }, opts);
  }
}
