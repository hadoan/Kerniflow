import { type LoggerPort } from "../ports/logger.port";
import { type IdempotencyPort } from "../ports/idempotency.port";
import { type UnitOfWorkPort } from "../ports/unit-of-work.port";
import { type Result, err, isOk } from "./result";
import { type UseCaseContext } from "./context";
import { UseCaseError, ValidationError } from "./errors";
import { type UseCase } from "./usecase";

type BaseDeps = {
  logger: LoggerPort;
  uow?: UnitOfWorkPort;
  idempotency?: IdempotencyPort;
};

export abstract class BaseUseCase<I, O, E extends UseCaseError = UseCaseError> implements UseCase<
  I,
  O,
  E
> {
  protected constructor(protected readonly deps: BaseDeps) {}

  protected validate?(input: I): I;
  protected getIdempotencyKey?(input: I, ctx: UseCaseContext): string | undefined;

  protected abstract handle(input: I, ctx: UseCaseContext): Promise<Result<O, E>>;

  async execute(input: I, ctx: UseCaseContext): Promise<Result<O, E>> {
    const startedAt = Date.now();
    const useCaseName = this.constructor.name || "UseCase";
    const baseMeta = {
      useCase: useCaseName,
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      correlationId: ctx.correlationId,
      requestId: ctx.requestId,
    };

    let validatedInput = input;
    if (this.validate) {
      try {
        validatedInput = this.validate(input);
      } catch (error) {
        const validationError =
          error instanceof ValidationError
            ? error
            : new ValidationError("Validation failed", error);
        this.deps.logger.warn(`${useCaseName}.validation_failed`, {
          ...baseMeta,
          error: this.toLoggableError(error),
        });
        return err(validationError as E);
      }
    }

    let runner = () => this.handle(validatedInput, ctx);

    if (this.deps.uow) {
      const originalRunner = runner;
      runner = () => this.deps.uow!.withinTransaction(() => originalRunner());
    }

    const idempotencyKey = this.resolveIdempotencyKey(validatedInput, ctx);
    if (idempotencyKey && this.deps.idempotency) {
      const originalRunner = runner;
      runner = () => this.deps.idempotency!.run(idempotencyKey, () => originalRunner());
    }

    this.deps.logger.debug(`${useCaseName}.start`, {
      ...baseMeta,
      idempotencyKey,
    });

    try {
      const result = await runner();
      const durationMs = Date.now() - startedAt;

      if (isOk(result)) {
        this.deps.logger.info(`${useCaseName}.success`, { ...baseMeta, durationMs });
      } else {
        this.deps.logger.warn(`${useCaseName}.failed`, {
          ...baseMeta,
          durationMs,
          error: this.toLoggableError(result.error),
        });
      }

      return result;
    } catch (error) {
      const durationMs = Date.now() - startedAt;
      this.deps.logger.error(`${useCaseName}.unhandled`, {
        ...baseMeta,
        durationMs,
        error: this.toLoggableError(error),
      });

      if (!(error instanceof UseCaseError)) {
        throw error;
      }

      return err(error as E);
    }
  }

  private resolveIdempotencyKey(input: I, ctx: UseCaseContext): string | undefined {
    const keyFromHook = this.getIdempotencyKey?.(input, ctx);
    if (keyFromHook) {
      return keyFromHook;
    }

    if (typeof (input as any)?.idempotencyKey === "string") {
      return (input as any).idempotencyKey;
    }

    return undefined;
  }

  private toLoggableError(error: unknown): unknown {
    if (error instanceof UseCaseError) {
      return error.toJSON();
    }

    if (error instanceof Error) {
      return { name: error.name, message: error.message, stack: error.stack };
    }

    return error;
  }
}
