import { Inject, Injectable } from "@nestjs/common";
import type { GetCurrentShiftInput, GetCurrentShiftOutput } from "@corely/contracts";
import {
  BaseUseCase,
  NoopLogger,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ValidationError,
  err,
  ok,
} from "@corely/kernel";
import {
  SHIFT_SESSION_REPOSITORY_PORT,
  type ShiftSessionRepositoryPort,
} from "../ports/shift-session-repository.port";

@Injectable()
export class GetCurrentShiftUseCase extends BaseUseCase<
  GetCurrentShiftInput,
  GetCurrentShiftOutput
> {
  constructor(
    @Inject(SHIFT_SESSION_REPOSITORY_PORT) private shiftRepo: ShiftSessionRepositoryPort
  ) {
    super({ logger: new NoopLogger() });
  }

  protected async handle(
    input: GetCurrentShiftInput,
    ctx: UseCaseContext
  ): Promise<Result<GetCurrentShiftOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId missing from context"));
    }

    const session = await this.shiftRepo.findOpenByRegister(ctx.tenantId, input.registerId);

    return ok({
      session: session ? session.toDto() : null,
    });
  }
}
