import type { APIRequestContext, APIResponse } from "@playwright/test";
import { buildAuthHeaders, type AuthContext } from "./auth.ts";

const API_BASE_URL = process.env.API_URL ?? "http://localhost:3000";

type QueryValue = string | number | boolean | null | undefined;
type QueryParams = Record<string, QueryValue>;

type RequestScope = {
  tenantId?: string;
  workspaceId?: string;
};

type RequestOptions = {
  query?: QueryParams;
  headers?: Record<string, string>;
  scope?: RequestScope;
};

function buildUrl(pathname: string, query?: QueryParams): string {
  const params = new URLSearchParams();
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null) {
        params.set(key, String(value));
      }
    }
  }

  const queryString = params.toString();
  return `${API_BASE_URL}${pathname}${queryString ? `?${queryString}` : ""}`;
}

export class HttpClient {
  constructor(
    private readonly request: APIRequestContext,
    private readonly auth: AuthContext
  ) {}

  private headers(options?: {
    idempotencyKey?: string;
    scope?: RequestScope;
    extraHeaders?: Record<string, string>;
    json?: boolean;
  }): Record<string, string> {
    const base = buildAuthHeaders(this.auth, options?.scope);
    const headers: Record<string, string> = {
      ...base,
      ...(options?.extraHeaders ?? {}),
    };

    if (options?.json !== false) {
      headers["Content-Type"] = "application/json";
    }
    if (options?.idempotencyKey) {
      headers["Idempotency-Key"] = options.idempotencyKey;
    }

    return headers;
  }

  async get(pathname: string, options?: RequestOptions): Promise<APIResponse> {
    const headerInput: {
      idempotencyKey?: string;
      scope?: RequestScope;
      extraHeaders?: Record<string, string>;
      json?: boolean;
    } = { json: false };
    if (options?.scope) {
      headerInput.scope = options.scope;
    }
    if (options?.headers) {
      headerInput.extraHeaders = options.headers;
    }

    return this.request.get(buildUrl(pathname, options?.query), {
      headers: this.headers(headerInput),
    });
  }

  async getJson(
    pathname: string,
    options?: RequestOptions
  ): Promise<{ response: APIResponse; body: unknown }> {
    const response = await this.get(pathname, options);
    const body = await response.json();
    return { response, body };
  }

  async getBytes(
    pathname: string,
    options?: RequestOptions
  ): Promise<{ response: APIResponse; body: Buffer }> {
    const response = await this.get(pathname, options);
    const body = Buffer.from(await response.body());
    return { response, body };
  }

  async postJson(
    pathname: string,
    data: unknown,
    idempotency: string,
    options?: Omit<RequestOptions, "query">
  ): Promise<{ response: APIResponse; body: unknown }> {
    const headerInput: {
      idempotencyKey?: string;
      scope?: RequestScope;
      extraHeaders?: Record<string, string>;
      json?: boolean;
    } = { idempotencyKey: idempotency };
    if (options?.scope) {
      headerInput.scope = options.scope;
    }
    if (options?.headers) {
      headerInput.extraHeaders = options.headers;
    }

    const response = await this.request.post(buildUrl(pathname), {
      headers: this.headers(headerInput),
      data,
    });
    const body = await response.json();
    return { response, body };
  }

  async putJson(
    pathname: string,
    data: unknown,
    idempotency: string,
    options?: Omit<RequestOptions, "query">
  ): Promise<{ response: APIResponse; body: unknown }> {
    const headerInput: {
      idempotencyKey?: string;
      scope?: RequestScope;
      extraHeaders?: Record<string, string>;
      json?: boolean;
    } = { idempotencyKey: idempotency };
    if (options?.scope) {
      headerInput.scope = options.scope;
    }
    if (options?.headers) {
      headerInput.extraHeaders = options.headers;
    }

    const response = await this.request.put(buildUrl(pathname), {
      headers: this.headers(headerInput),
      data,
    });
    const body = await response.json();
    return { response, body };
  }

  async patchJson(
    pathname: string,
    data: unknown,
    idempotency: string,
    options?: Omit<RequestOptions, "query">
  ): Promise<{ response: APIResponse; body: unknown }> {
    const headerInput: {
      idempotencyKey?: string;
      scope?: RequestScope;
      extraHeaders?: Record<string, string>;
      json?: boolean;
    } = { idempotencyKey: idempotency };
    if (options?.scope) {
      headerInput.scope = options.scope;
    }
    if (options?.headers) {
      headerInput.extraHeaders = options.headers;
    }

    const response = await this.request.patch(buildUrl(pathname), {
      headers: this.headers(headerInput),
      data,
    });
    const body = await response.json();
    return { response, body };
  }
}
