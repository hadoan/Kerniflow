import { describe, expect, it, vi } from "vitest";

import { BaseUseCase } from "../application/base-usecase";
import type { UseCaseContext } from "../application/context";
import { ValidationError } from "../application/errors";
import { isErr, isOk, ok, unwrap, type Result } from "../application/result";
import { InMemoryIdempotency } from "../testing/in-memory-idempotency";
import { NoopLogger } from "../testing/noop-logger";
import type { TransactionContext, UnitOfWorkPort } from "../ports/unit-of-work.port";
import type { IdempotencyPort } from "../ports/idempotency.port";

const ctx: UseCaseContext = { tenantId: "tenant-1", userId: "user-1" };

class EchoUseCase extends BaseUseCase<string, string> {
  constructor(deps: { logger: NoopLogger }) {
    super(deps);
  }

  protected async handle(input: string): Promise<Result<string, ValidationError>> {
    return ok(`echo:${input}`);
  }
}

class TransactionUseCase extends BaseUseCase<string, string> {
  constructor(
    logger: NoopLogger,
    private readonly uow: UnitOfWorkPort
  ) {
    super({ logger, uow });
  }

  protected async handle(input: string): Promise<Result<string, ValidationError>> {
    return ok(input);
  }
}

class IdempotentUseCase extends BaseUseCase<{ idempotencyKey: string }, number> {
  count = 0;

  constructor(deps: { logger: NoopLogger; idempotency?: IdempotencyPort }) {
    super(deps);
  }

  protected async handle(): Promise<Result<number, ValidationError>> {
    this.count += 1;
    return ok(this.count);
  }
}

class ValidateUseCase extends BaseUseCase<string, string> {
  constructor(deps: { logger: NoopLogger }) {
    super(deps);
  }

  protected validate(): string {
    throw new Error("invalid");
  }

  protected async handle(): Promise<Result<string, ValidationError>> {
    return ok("should-not-run");
  }
}

describe("BaseUseCase", () => {
  it("runs handle", async () => {
    const uc = new EchoUseCase({ logger: new NoopLogger() });
    const result = await uc.execute("ping", ctx);
    expect(isOk(result)).toBe(true);
    expect(unwrap(result)).toBe("echo:ping");
  });

  // it("wraps execution in transaction when provided", async () => {
  //   const withinTransaction = vi.fn(
  //     <T>(fn: (tx: TransactionContext) => Promise<T>): Promise<T> => fn({} as TransactionContext)
  //   );
  //   const fakeUow: UnitOfWorkPort = {
  //     withinTransaction,
  //   };
  //   const uc = new TransactionUseCase(new NoopLogger(), fakeUow);

  //   const result = await uc.execute("tx", ctx);

  //   expect(isOk(result)).toBe(true);
  //   expect(withinTransaction).toHaveBeenCalledTimes(1);
  // });

  it("uses idempotency store when key exists", async () => {
    const idempotency: IdempotencyPort = new InMemoryIdempotency();
    const uc = new IdempotentUseCase({ logger: new NoopLogger(), idempotency });

    const first = await uc.execute({ idempotencyKey: "key-1" }, ctx);
    const second = await uc.execute({ idempotencyKey: "key-1" }, ctx);

    expect(isOk(first)).toBe(true);
    expect(isOk(second)).toBe(true);
    expect(unwrap(first)).toBe(1);
    expect(unwrap(second)).toBe(1);
    expect(uc.count).toBe(1);
  });

  it("maps thrown validation to ValidationError", async () => {
    const uc = new ValidateUseCase({ logger: new NoopLogger() });
    const result = await uc.execute("anything", ctx);

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error).toBeInstanceOf(ValidationError);
      const validation = result.error as ValidationError;
      expect(validation.code).toBe("VALIDATION_ERROR");
    }
  });
});
