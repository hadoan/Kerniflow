import {
  CreateDirectoryLeadRequestSchema,
  CreateDirectoryLeadResponseSchema,
  DirectoryRestaurantDetailResponseSchema,
  DirectoryRestaurantListQuerySchema,
  DirectoryRestaurantListResponseSchema,
  type CreateDirectoryLeadRequest,
  type CreateDirectoryLeadResponse,
  type DirectoryRestaurantDetailResponse,
  type DirectoryRestaurantListQuery,
  type DirectoryRestaurantListResponse,
} from "@corely/contracts";
import { normalizeError } from "../errors/normalize-error";
import { request } from "../http/request";

const DEFAULT_BASE_URL = "http://localhost:3000";

export type DirectoryClientOptions = {
  baseUrl?: string;
  headers?: HeadersInit;
};

export type DirectoryRequestOptions = {
  correlationId?: string;
  signal?: AbortSignal;
};

export type DirectoryCreateLeadOptions = DirectoryRequestOptions & {
  idempotencyKey: string;
};

const resolveBaseUrl = (baseUrl?: string): string => {
  if (baseUrl && baseUrl.length > 0) {
    return baseUrl.replace(/\/$/, "");
  }

  if (typeof process !== "undefined") {
    const envBase = process.env.CORELY_API_BASE_URL ?? process.env.PUBLIC_API_BASE_URL;
    if (envBase && envBase.length > 0) {
      return envBase.replace(/\/$/, "");
    }
  }

  return DEFAULT_BASE_URL;
};

const toHeaders = (headers?: HeadersInit): Record<string, string> => {
  if (!headers) {
    return {};
  }

  if (headers instanceof Headers) {
    const result: Record<string, string> = {};
    headers.forEach((value: string, key: string) => {
      result[key] = value;
    });
    return result;
  }

  if (Array.isArray(headers)) {
    return Object.fromEntries(headers);
  }

  return { ...(headers as Record<string, string>) };
};

const buildUrl = (baseUrl: string, path: string, query?: URLSearchParams): string => {
  const qs = query?.toString();
  return `${baseUrl}${path}${qs ? `?${qs}` : ""}`;
};

const toCorrelationId = (value?: string) =>
  value && value.length > 0
    ? value
    : typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `corr_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

export const createDirectoryClient = (options?: DirectoryClientOptions) => {
  const baseUrl = resolveBaseUrl(options?.baseUrl);
  const clientHeaders = toHeaders(options?.headers);

  const execute = async <T>(fn: () => Promise<T>): Promise<T> => {
    try {
      return await fn();
    } catch (error) {
      throw normalizeError(error);
    }
  };

  return {
    async listRestaurants(
      params: DirectoryRestaurantListQuery,
      requestOptions?: DirectoryRequestOptions
    ): Promise<DirectoryRestaurantListResponse> {
      const parsed = DirectoryRestaurantListQuerySchema.parse(params);
      const query = new URLSearchParams();

      if (parsed.q) {
        query.set("q", parsed.q);
      }
      if (parsed.neighborhood) {
        query.set("neighborhood", parsed.neighborhood);
      }
      if (parsed.dish) {
        query.set("dish", parsed.dish);
      }
      query.set("page", String(parsed.page));
      query.set("pageSize", String(parsed.pageSize));

      return execute(async () => {
        const response = await request<DirectoryRestaurantListResponse>({
          url: buildUrl(baseUrl, "/v1/public/berlin/restaurants", query),
          method: "GET",
          headers: clientHeaders,
          correlationId: toCorrelationId(requestOptions?.correlationId),
          ...(requestOptions?.signal ? { signal: requestOptions.signal } : {}),
        });

        return DirectoryRestaurantListResponseSchema.parse(response);
      });
    },

    async getRestaurantBySlug(
      slug: string,
      requestOptions?: DirectoryRequestOptions
    ): Promise<DirectoryRestaurantDetailResponse> {
      return execute(async () => {
        const response = await request<DirectoryRestaurantDetailResponse>({
          url: buildUrl(baseUrl, `/v1/public/berlin/restaurants/${encodeURIComponent(slug)}`),
          method: "GET",
          headers: clientHeaders,
          correlationId: toCorrelationId(requestOptions?.correlationId),
          ...(requestOptions?.signal ? { signal: requestOptions.signal } : {}),
        });

        return DirectoryRestaurantDetailResponseSchema.parse(response);
      });
    },

    async createLead(
      input: CreateDirectoryLeadRequest,
      requestOptions: DirectoryCreateLeadOptions
    ): Promise<CreateDirectoryLeadResponse> {
      const parsed = CreateDirectoryLeadRequestSchema.parse(input);

      return execute(async () => {
        const response = await request<CreateDirectoryLeadResponse>({
          url: buildUrl(baseUrl, "/v1/public/berlin/leads"),
          method: "POST",
          headers: clientHeaders,
          body: parsed,
          idempotencyKey: requestOptions.idempotencyKey,
          correlationId: toCorrelationId(requestOptions.correlationId),
          ...(requestOptions.signal ? { signal: requestOptions.signal } : {}),
        });

        return CreateDirectoryLeadResponseSchema.parse(response);
      });
    },
  };
};

export const directory = createDirectoryClient();

export type DirectoryClient = ReturnType<typeof createDirectoryClient>;
