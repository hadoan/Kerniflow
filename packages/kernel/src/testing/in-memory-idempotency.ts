import { type IdempotencyPort } from "../ports/idempotency.port";

export class InMemoryIdempotency implements IdempotencyPort {
  private readonly store = new Map<string, Promise<unknown>>();

  async run<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const existing = this.store.get(key);
    if (existing) {
      return existing as Promise<T>;
    }

    const promise = (async () => {
      try {
        const result = await fn();
        return result;
      } catch (error) {
        this.store.delete(key);
        throw error;
      }
    })();

    this.store.set(key, promise);
    const result = await promise;
    this.store.set(key, Promise.resolve(result));
    return result;
  }
}
