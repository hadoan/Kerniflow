import {
  request,
  createIdempotencyKey,
  HttpError,
  subscribeSse,
  type SseParsedEvent,
  type SseReconnectOptions,
} from "@corely/api-client";
import type { AuthClient } from "./auth-client";
import type { TokenStorage } from "./storage/storage.interface";

export interface ApiClientConfig {
  apiUrl: string;
  authClient: AuthClient;
  storage: TokenStorage;
  onAuthError?: () => void;
}

export interface ApiClientSseOptions<TData = unknown> {
  onEvent: (event: SseParsedEvent<TData>) => void;
  onError?: (error: unknown) => void;
  onOpen?: (response: Response) => void;
  onClose?: () => void;
  parseData?: (rawData: string, event: string) => TData;
  signal?: AbortSignal;
  reconnect?: Partial<SseReconnectOptions>;
  headers?: HeadersInit;
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

  getBaseUrl(): string {
    return this.apiUrl;
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
      parseJson?: boolean;
      signal?: AbortSignal;
    }
  ): Promise<T> {
    if (!opts?.skipTokenRefresh) {
      await this.authClient.ensureValidAccessToken();
    }

    const accessToken = this.authClient.getAccessToken();
    const workspaceId = await this.storage.getActiveWorkspaceId();
    const parseJson = opts?.parseJson ?? true;
    const requestOptions = {
      url: `${this.apiUrl}${endpoint}`,
      method: options.method ?? "GET",
      headers: options.headers,
      body: options.body as BodyInit | null | undefined,
      accessToken,
      workspaceId: workspaceId ?? null,
      idempotencyKey: opts?.idempotencyKey,
      correlationId: opts?.correlationId,
      parseJson,
      ...(opts?.signal ? { signal: opts.signal } : {}),
    };

    try {
      return await request<T>(requestOptions);
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
    opts?: { idempotencyKey?: string; correlationId?: string; headers?: HeadersInit }
  ): Promise<T> {
    const requestInit: RequestInit = { method: "POST" };
    if (opts?.headers) {
      requestInit.headers = opts.headers;
    }
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

  async delete<T>(
    endpoint: string,
    body?: unknown,
    opts?: { idempotencyKey?: string; correlationId?: string }
  ): Promise<T> {
    const requestInit: RequestInit = { method: "DELETE" };
    if (body !== undefined) {
      requestInit.body = body as BodyInit | null;
    }
    return this.request<T>(endpoint, requestInit, opts);
  }

  async getBlob(endpoint: string, opts?: { correlationId?: string }): Promise<Blob> {
    const response = await this.request<Response>(
      endpoint,
      { method: "GET" },
      { ...opts, parseJson: false }
    );
    return response.blob();
  }

  async subscribeSse<TData = unknown>(
    endpoint: string,
    options: ApiClientSseOptions<TData>
  ): Promise<() => void> {
    await this.authClient.ensureValidAccessToken();

    const accessToken = this.authClient.getAccessToken();
    const workspaceId = await this.storage.getActiveWorkspaceId();

    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };

    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }
    if (workspaceId) {
      headers["X-Workspace-Id"] = workspaceId;
    }

    return subscribeSse<TData>(`${this.apiUrl}${endpoint}`, {
      ...options,
      headers,
    });
  }
}
