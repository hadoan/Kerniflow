/**
 * API Client
 * Centralized HTTP wrapper with retry + idempotency awareness
 */

import { createIdempotencyKey, request, HttpError } from "@kerniflow/api-client";
import { authClient } from "./auth-client";
import { getActiveWorkspaceId } from "@/shared/workspaces/workspace-store";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

class ApiClient {
  private isRefreshing = false;
  private refreshPromise: Promise<void> | null = null;

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
    const accessToken = authClient.getAccessToken();
    const workspaceId = getActiveWorkspaceId();

    try {
      return await request<T>({
        url: `${API_URL}${endpoint}`,
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
        authClient.getAccessToken()
      ) {
        // If another request is already refreshing, wait for it
        if (this.isRefreshing && this.refreshPromise) {
          await this.refreshPromise;
        } else {
          // Start refreshing
          this.isRefreshing = true;
          this.refreshPromise = authClient
            .refreshAccessToken()
            .catch((refreshError) => {
              // If refresh fails, clear tokens and redirect to login
              authClient.clearTokens();
              if (typeof window !== "undefined") {
                window.location.href = "/login";
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
    return this.request<T>(
      endpoint,
      {
        method: "POST",
        body: body as BodyInit | null | undefined,
      },
      opts
    );
  }

  async put<T>(
    endpoint: string,
    body?: unknown,
    opts?: { idempotencyKey?: string; correlationId?: string }
  ): Promise<T> {
    return this.request<T>(
      endpoint,
      {
        method: "PUT",
        body: body as BodyInit | null | undefined,
      },
      opts
    );
  }

  async patch<T>(
    endpoint: string,
    body?: unknown,
    opts?: { idempotencyKey?: string; correlationId?: string }
  ): Promise<T> {
    return this.request<T>(
      endpoint,
      {
        method: "PATCH",
        body: body as BodyInit | null | undefined,
      },
      opts
    );
  }

  async delete<T>(endpoint: string, opts?: { correlationId?: string }): Promise<T> {
    return this.request<T>(endpoint, { method: "DELETE" }, opts);
  }
}

export const apiClient = new ApiClient();
