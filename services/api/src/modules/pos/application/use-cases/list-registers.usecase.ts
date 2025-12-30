import { Inject, Injectable } from "@nestjs/common";
import type { ListRegistersInput, ListRegistersOutput } from "@corely/contracts";
import {
  BaseUseCase,
  NoopLogger,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ValidationError,
  ok,
  err,
} from "@corely/kernel";
import {
  REGISTER_REPOSITORY_PORT,
  type RegisterRepositoryPort,
} from "../ports/register-repository.port";

@Injectable()
export class ListRegistersUseCase extends BaseUseCase<ListRegistersInput, ListRegistersOutput> {
  constructor(@Inject(REGISTER_REPOSITORY_PORT) private registerRepo: RegisterRepositoryPort) {
    super({ logger: new NoopLogger() });
  }

  protected async handle(
    input: ListRegistersInput,
    ctx: UseCaseContext
  ): Promise<Result<ListRegistersOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId missing from context"));
    }

    const registers = await this.registerRepo.findByWorkspace(ctx.tenantId, input.status);

    return ok({
      registers: registers.map((r) => r.toDto()),
    });
  }
}
