export type RetryableResult = {
  response?: Response;
  error?: unknown;
  method?: string;
  idempotencyKey?: string;
  isIdempotentRequest?: boolean;
};

export type RetryPolicyOptions = {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  jitterMs: number;
};

export const defaultRetryPolicy: RetryPolicyOptions = {
  maxAttempts: 3, // 1 initial + 2 retries
  baseDelayMs: 250,
  maxDelayMs: 5000,
  jitterMs: 100,
};

const retryableStatusCodes = new Set([408, 429, 500, 502, 503, 504]);

const safeMethods = new Set(["GET", "HEAD", "OPTIONS"]);

export function parseRetryAfterMs(
  headerValue: string | null,
  now: () => Date = () => new Date()
): number | null {
  if (!headerValue) {
    return null;
  }
  const seconds = Number(headerValue);
  if (!Number.isNaN(seconds)) {
    return seconds > 0 ? seconds * 1000 : 0;
  }
  const date = new Date(headerValue);
  const delta = date.getTime() - now().getTime();
  if (Number.isFinite(delta) && delta > 0) {
    return delta;
  }
  return null;
}

export function computeBackoffDelayMs(attempt: number, opts: RetryPolicyOptions): number {
  const exp = opts.baseDelayMs * Math.pow(2, Math.max(0, attempt - 1));
  const withCap = Math.min(opts.maxDelayMs, exp);
  const jitter = Math.random() * opts.jitterMs;
  return withCap + jitter;
}

export function shouldRetry(
  attempt: number,
  { response, error, method, idempotencyKey, isIdempotentRequest }: RetryableResult,
  maxAttempts: number = defaultRetryPolicy.maxAttempts
): boolean {
  if (attempt >= maxAttempts) {
    return false;
  }

  const normalizedMethod = (method || "GET").toUpperCase();
  const methodIsSafe = safeMethods.has(normalizedMethod);
  const methodAllowsRetry = methodIsSafe || Boolean(idempotencyKey) || Boolean(isIdempotentRequest);

  if (!methodAllowsRetry) {
    return false;
  }

  if (error) {
    // Network / fetch errors
    return true;
  }

  if (!response) {
    return false;
  }

  if (response.status === 500 && !methodIsSafe && !idempotencyKey && !isIdempotentRequest) {
    return false;
  }

  return retryableStatusCodes.has(response.status);
}

export function getRetryAfterMs(response?: Response): number | null {
  if (!response) {
    return null;
  }
  const header = response.headers?.get("Retry-After");
  return parseRetryAfterMs(header);
}
