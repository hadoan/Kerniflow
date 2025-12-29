export type IdempotencyKey = string;

export type IdempotencyResult<T> = {
  key: IdempotencyKey;
  value: T;
};

export function buildIdempotencyKey(namespace: string, ...parts: string[]): IdempotencyKey {
  const safeParts = parts.filter((part) => part && part.length > 0);
  return [namespace, ...safeParts].join("/");
}
