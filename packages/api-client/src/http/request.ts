import {
  computeBackoffDelayMs,
  defaultRetryPolicy,
  getRetryAfterMs,
  type RetryableResult,
  type RetryPolicyOptions,
  shouldRetry,
} from "../retry/retryPolicy";
import { createIdempotencyKey } from "../idempotency";

export class HttpError extends Error {
  constructor(
    message: string,
    public status: number | null,
    public body?: unknown
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export type RequestOptions = {
  url: string;
  method?: string;
  headers?: HeadersInit | undefined;
  body?: unknown;
  accessToken?: string | null | undefined;
  workspaceId?: string | null | undefined;
  idempotencyKey?: string | undefined;
  correlationId?: string | undefined;
  retry?: Partial<RetryPolicyOptions>;
  parseJson?: boolean;
  streaming?: boolean;
};

type InternalInit = RequestInit & { url: string };

export async function request<T = unknown>(opts: RequestOptions): Promise<T> {
  const policy: RetryPolicyOptions = { ...defaultRetryPolicy, ...(opts.retry ?? {}) };
  const method = (opts.method ?? "GET").toUpperCase();
  const idempotencyKey =
    opts.idempotencyKey && opts.idempotencyKey.length ? opts.idempotencyKey : undefined;
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(opts.headers as Record<string, string>),
  };

  if (opts.accessToken) {
    headers["Authorization"] = `Bearer ${opts.accessToken}`;
  }
  if (opts.workspaceId) {
    headers["X-Workspace-Id"] = opts.workspaceId;
  }
  if (idempotencyKey) {
    headers["X-Idempotency-Key"] = idempotencyKey;
  }
  if (opts.correlationId) {
    headers["X-Correlation-Id"] = opts.correlationId;
  }

  const body =
    opts.body && typeof opts.body === "object" && !(opts.body instanceof FormData)
      ? JSON.stringify(opts.body)
      : (opts.body as BodyInit | null | undefined);

  if (body && !(opts.body instanceof FormData)) {
    headers["Content-Type"] = headers["Content-Type"] ?? "application/json";
  }

  const init: InternalInit = {
    url: opts.url,
    method,
    headers,
  };
  if (body !== undefined) {
    init.body = body;
  }

  if (opts.streaming) {
    // For streaming, attempt only once to avoid mid-stream retries.
    return executeOnce<T>(init);
  }

  let lastError: unknown;
  for (let attempt = 1; attempt <= policy.maxAttempts; attempt++) {
    try {
      const response = await fetch(init.url, init);

      if (response.ok) {
        return parseResponse<T>(response, opts.parseJson !== false);
      }

      const retryAfter = getRetryAfterMs(response);
      const responseRetryContext: RetryableResult = { response, method };
      if (idempotencyKey) {
        responseRetryContext.idempotencyKey = idempotencyKey;
      }
      if (!shouldRetry(attempt, responseRetryContext, policy.maxAttempts)) {
        const errorBody = await safeParseBody(response);
        throw new HttpError(response.statusText, response.status, errorBody);
      }

      await delayForRetry(attempt, policy, retryAfter);
      continue;
    } catch (error) {
      lastError = error;
      if (error instanceof HttpError) {
        throw error;
      }
      const errorRetryContext: RetryableResult = { error, method };
      if (idempotencyKey) {
        errorRetryContext.idempotencyKey = idempotencyKey;
      }
      if (!shouldRetry(attempt, errorRetryContext, policy.maxAttempts)) {
        throw new HttpError(error instanceof Error ? error.message : "Request failed", null, error);
      }
      await delayForRetry(attempt, policy);
    }
  }

  throw new HttpError(
    lastError instanceof Error ? lastError.message : "Request failed after retries",
    null,
    lastError
  );
}

async function executeOnce<T>(init: InternalInit): Promise<T> {
  const response = await fetch(init.url, init);
  if (!response.ok) {
    const errorBody = await safeParseBody(response);
    throw new HttpError(response.statusText, response.status, errorBody);
  }
  return parseResponse<T>(response, true);
}

async function parseResponse<T>(response: Response, parseJson: boolean): Promise<T> {
  if (response.status === 204) {
    return undefined as T;
  }
  if (!parseJson) {
    return response as unknown as T;
  }
  return (await response.json()) as T;
}

async function safeParseBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get("Content-Type") ?? "";
  if (contentType.includes("application/json")) {
    try {
      return await response.json();
    } catch {
      return null;
    }
  }
  try {
    return await response.text();
  } catch {
    return null;
  }
}

async function delayForRetry(
  attempt: number,
  policy: RetryPolicyOptions,
  retryAfterMs: number | null = null
): Promise<void> {
  const backoff = computeBackoffDelayMs(attempt, policy);
  const waitMs = retryAfterMs !== null ? Math.max(retryAfterMs, backoff) : backoff;
  await new Promise((resolve) => setTimeout(resolve, waitMs));
}

export { createIdempotencyKey };
