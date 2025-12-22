/**
 * API Client
 * Generic HTTP client for calling backend API endpoints
 */

import { authClient } from "./auth-client";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

class ApiClient {
  /**
   * Generate idempotency key
   */
  generateIdempotencyKey(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(7)}`;
  }

  /**
   * Generate correlation ID for request tracing
   */
  generateCorrelationId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(7)}`;
  }

  /**
   * Make an authenticated API request
   */
  async request<T>(
    endpoint: string,
    options: RequestInit = {},
    opts?: {
      idempotencyKey?: string;
      correlationId?: string;
    }
  ): Promise<T> {
    const accessToken = authClient.getAccessToken();
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...options.headers,
    };

    // Add auth header if we have a token
    if (accessToken) {
      headers["Authorization"] = `Bearer ${accessToken}`;
    }

    // Add idempotency key if provided
    if (opts?.idempotencyKey) {
      headers["X-Idempotency-Key"] = opts.idempotencyKey;
    }

    // Add correlation ID if provided
    if (opts?.correlationId) {
      headers["X-Correlation-Id"] = opts.correlationId;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      // Try to get error details from response
      let errorData: unknown;
      try {
        errorData = await response.json();
      } catch {
        errorData = await response.text();
      }

      throw new ApiError(`API request failed: ${response.statusText}`, response.status, errorData);
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string, opts?: { correlationId?: string }): Promise<T> {
    return this.request<T>(endpoint, { method: "GET" }, opts);
  }

  /**
   * POST request
   */
  async post<T>(
    endpoint: string,
    body?: unknown,
    opts?: { idempotencyKey?: string; correlationId?: string }
  ): Promise<T> {
    return this.request<T>(
      endpoint,
      {
        method: "POST",
        body: body ? JSON.stringify(body) : undefined,
      },
      opts
    );
  }

  /**
   * PUT request
   */
  async put<T>(
    endpoint: string,
    body?: unknown,
    opts?: { idempotencyKey?: string; correlationId?: string }
  ): Promise<T> {
    return this.request<T>(
      endpoint,
      {
        method: "PUT",
        body: body ? JSON.stringify(body) : undefined,
      },
      opts
    );
  }

  /**
   * PATCH request
   */
  async patch<T>(
    endpoint: string,
    body?: unknown,
    opts?: { idempotencyKey?: string; correlationId?: string }
  ): Promise<T> {
    return this.request<T>(
      endpoint,
      {
        method: "PATCH",
        body: body ? JSON.stringify(body) : undefined,
      },
      opts
    );
  }

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string, opts?: { correlationId?: string }): Promise<T> {
    return this.request<T>(endpoint, { method: "DELETE" }, opts);
  }
}

export const apiClient = new ApiClient();
