/**
 * API Client
 * Centralized HTTP wrapper with retry + idempotency awareness
 */

import { createIdempotencyKey, request } from "@kerniflow/api-client";
import { authClient } from "./auth-client";
import { getActiveWorkspaceId } from "@/shared/workspaces/workspace-store";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

class ApiClient {
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
    }
  ): Promise<T> {
    const accessToken = authClient.getAccessToken();
    const workspaceId = getActiveWorkspaceId();

    return request<T>({
      url: `${API_URL}${endpoint}`,
      method: options.method ?? "GET",
      headers: options.headers,
      body: options.body as any,
      accessToken,
      workspaceId: workspaceId ?? null,
      idempotencyKey: opts?.idempotencyKey,
      correlationId: opts?.correlationId,
    });
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
        body,
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
        body,
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
        body,
      },
      opts
    );
  }

  async delete<T>(endpoint: string, opts?: { correlationId?: string }): Promise<T> {
    return this.request<T>(endpoint, { method: "DELETE" }, opts);
  }
}

export const apiClient = new ApiClient();
