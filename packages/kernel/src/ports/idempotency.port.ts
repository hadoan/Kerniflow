/**
 * Run once per key. If already completed, return cached value.
 * Store must be safe for concurrency (adapter responsibility).
 */
export interface IdempotencyPort {
  run<T>(key: string, fn: () => Promise<T>): Promise<T>;
}

export const IDEMPOTENCY_PORT = "kernel/idempotency-port";
