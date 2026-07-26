import {
  AdminDirectoryRestaurantDetailResponseSchema,
  AdminDirectoryRestaurantListQuerySchema,
  AdminDirectoryRestaurantListResponseSchema,
  CreateAdminDirectoryRestaurantRequestSchema,
  CreateAdminDirectoryRestaurantResponseSchema,
  SetRestaurantStatusResponseSchema,
  UpdateAdminDirectoryRestaurantRequestSchema,
  UpdateAdminDirectoryRestaurantResponseSchema,
  type AdminDirectoryRestaurantDetailResponse,
  type AdminDirectoryRestaurantListQuery,
  type AdminDirectoryRestaurantListResponse,
  type CreateAdminDirectoryRestaurantRequest,
  type CreateAdminDirectoryRestaurantResponse,
  type SetRestaurantStatusRequest,
  type SetRestaurantStatusResponse,
  type UpdateAdminDirectoryRestaurantRequest,
  type UpdateAdminDirectoryRestaurantResponse,
} from "@corely/contracts";
import { normalizeError } from "../errors/normalize-error";
import { request } from "../http/request";

const DEFAULT_BASE_URL = "http://localhost:3000";

export type DirectoryAdminAuthOptions = {
  accessToken?: string | null;
  tenantId?: string | null;
  workspaceId?: string | null;
};

export type DirectoryAdminClientOptions = DirectoryAdminAuthOptions & {
  baseUrl?: string;
  headers?: HeadersInit;
};

export type DirectoryAdminRequestOptions = DirectoryAdminAuthOptions & {
  correlationId?: string;
  signal?: AbortSignal;
};

export type DirectoryAdminCreateRestaurantOptions = DirectoryAdminRequestOptions & {
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

const resolveAuth = (
  defaults: DirectoryAdminAuthOptions,
  overrides?: DirectoryAdminAuthOptions
): DirectoryAdminAuthOptions => {
  const resolvedAccessToken = overrides?.accessToken ?? defaults.accessToken;
  const resolvedTenantId = overrides?.tenantId ?? defaults.tenantId;
  const resolvedWorkspaceId = overrides?.workspaceId ?? defaults.workspaceId;

  const result: DirectoryAdminAuthOptions = {};
  if (resolvedAccessToken !== undefined) {
    result.accessToken = resolvedAccessToken;
  }
  if (resolvedTenantId !== undefined) {
    result.tenantId = resolvedTenantId;
  }
  if (resolvedWorkspaceId !== undefined) {
    result.workspaceId = resolvedWorkspaceId;
  }

  return result;
};

export const createAdminDirectoryClient = (options?: DirectoryAdminClientOptions) => {
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
      params: AdminDirectoryRestaurantListQuery,
      requestOptions?: DirectoryAdminRequestOptions
    ): Promise<AdminDirectoryRestaurantListResponse> {
      const parsed = AdminDirectoryRestaurantListQuerySchema.parse(params);
      const query = new URLSearchParams();

      if (parsed.q) {
        query.set("q", parsed.q);
      }
      if (parsed.status) {
        query.set("status", parsed.status);
      }
      if (parsed.neighborhood) {
        query.set("neighborhood", parsed.neighborhood);
      }
      if (parsed.dish) {
        query.set("dish", parsed.dish);
      }
      if (parsed.sort) {
        query.set("sort", parsed.sort);
      }
      query.set("page", String(parsed.page));
      query.set("pageSize", String(parsed.pageSize));

      return execute(async () => {
        const auth = resolveAuth(options ?? {}, requestOptions);
        const response = await request<AdminDirectoryRestaurantListResponse>({
          url: buildUrl(baseUrl, "/v1/admin/directory/restaurants", query),
          method: "GET",
          headers: clientHeaders,
          accessToken: auth.accessToken,
          tenantId: auth.tenantId,
          workspaceId: auth.workspaceId,
          correlationId: toCorrelationId(requestOptions?.correlationId),
          ...(requestOptions?.signal ? { signal: requestOptions.signal } : {}),
        });

        return AdminDirectoryRestaurantListResponseSchema.parse(response);
      });
    },

    async getRestaurant(
      id: string,
      requestOptions?: DirectoryAdminRequestOptions
    ): Promise<AdminDirectoryRestaurantDetailResponse> {
      return execute(async () => {
        const auth = resolveAuth(options ?? {}, requestOptions);
        const response = await request<AdminDirectoryRestaurantDetailResponse>({
          url: buildUrl(baseUrl, `/v1/admin/directory/restaurants/${encodeURIComponent(id)}`),
          method: "GET",
          headers: clientHeaders,
          accessToken: auth.accessToken,
          tenantId: auth.tenantId,
          workspaceId: auth.workspaceId,
          correlationId: toCorrelationId(requestOptions?.correlationId),
          ...(requestOptions?.signal ? { signal: requestOptions.signal } : {}),
        });

        return AdminDirectoryRestaurantDetailResponseSchema.parse(response);
      });
    },

    async createRestaurant(
      input: CreateAdminDirectoryRestaurantRequest,
      requestOptions: DirectoryAdminCreateRestaurantOptions
    ): Promise<CreateAdminDirectoryRestaurantResponse> {
      const parsed = CreateAdminDirectoryRestaurantRequestSchema.parse(input);

      return execute(async () => {
        const auth = resolveAuth(options ?? {}, requestOptions);
        const response = await request<CreateAdminDirectoryRestaurantResponse>({
          url: buildUrl(baseUrl, "/v1/admin/directory/restaurants"),
          method: "POST",
          headers: clientHeaders,
          body: parsed,
          accessToken: auth.accessToken,
          tenantId: auth.tenantId,
          workspaceId: auth.workspaceId,
          idempotencyKey: requestOptions.idempotencyKey,
          correlationId: toCorrelationId(requestOptions.correlationId),
          ...(requestOptions.signal ? { signal: requestOptions.signal } : {}),
        });

        return CreateAdminDirectoryRestaurantResponseSchema.parse(response);
      });
    },

    async updateRestaurant(
      id: string,
      patch: UpdateAdminDirectoryRestaurantRequest,
      requestOptions?: DirectoryAdminRequestOptions
    ): Promise<UpdateAdminDirectoryRestaurantResponse> {
      const parsed = UpdateAdminDirectoryRestaurantRequestSchema.parse(patch);

      return execute(async () => {
        const auth = resolveAuth(options ?? {}, requestOptions);
        const response = await request<UpdateAdminDirectoryRestaurantResponse>({
          url: buildUrl(baseUrl, `/v1/admin/directory/restaurants/${encodeURIComponent(id)}`),
          method: "PATCH",
          headers: clientHeaders,
          body: parsed,
          accessToken: auth.accessToken,
          tenantId: auth.tenantId,
          workspaceId: auth.workspaceId,
          correlationId: toCorrelationId(requestOptions?.correlationId),
          ...(requestOptions?.signal ? { signal: requestOptions.signal } : {}),
        });

        return UpdateAdminDirectoryRestaurantResponseSchema.parse(response);
      });
    },

    async setRestaurantStatus(
      id: string,
      status: SetRestaurantStatusRequest["status"],
      requestOptions?: DirectoryAdminRequestOptions
    ): Promise<SetRestaurantStatusResponse> {
      return execute(async () => {
        const auth = resolveAuth(options ?? {}, requestOptions);
        const response = await request<SetRestaurantStatusResponse>({
          url: buildUrl(
            baseUrl,
            `/v1/admin/directory/restaurants/${encodeURIComponent(id)}/status`
          ),
          method: "PATCH",
          headers: clientHeaders,
          body: { status },
          accessToken: auth.accessToken,
          tenantId: auth.tenantId,
          workspaceId: auth.workspaceId,
          correlationId: toCorrelationId(requestOptions?.correlationId),
          ...(requestOptions?.signal ? { signal: requestOptions.signal } : {}),
        });

        return SetRestaurantStatusResponseSchema.parse(response);
      });
    },
  };
};

export const adminDirectory = createAdminDirectoryClient();

export type AdminDirectoryClient = ReturnType<typeof createAdminDirectoryClient>;
