import { Inject, Injectable } from "@nestjs/common";
import type { CreateRegisterInput, CreateRegisterOutput } from "@corely/contracts";
import {
  BaseUseCase,
  ConflictError,
  NoopLogger,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ValidationError,
  err,
  ok,
} from "@corely/kernel";
import { Register } from "../../domain/register.aggregate";
import {
  REGISTER_REPOSITORY_PORT,
  type RegisterRepositoryPort,
} from "../ports/register-repository.port";
import type { IdGeneratorPort } from "../../../../shared/ports/id-generator.port";
import { ID_GENERATOR_TOKEN } from "../../../../shared/ports/id-generator.port";

@Injectable()
export class CreateRegisterUseCase extends BaseUseCase<CreateRegisterInput, CreateRegisterOutput> {
  constructor(
    @Inject(REGISTER_REPOSITORY_PORT) private registerRepo: RegisterRepositoryPort,
    @Inject(ID_GENERATOR_TOKEN) private idGenerator: IdGeneratorPort
  ) {
    super({ logger: new NoopLogger() });
  }

  protected async handle(
    input: CreateRegisterInput,
    ctx: UseCaseContext
  ): Promise<Result<CreateRegisterOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId missing from context"));
    }

    // Check if name already exists
    const exists = await this.registerRepo.existsByName(ctx.tenantId, input.name);
    if (exists) {
      return err(
        new ConflictError(
          "REGISTER_NAME_EXISTS",
          `Register with name '${input.name}' already exists`
        )
      );
    }

    // Create register aggregate
    const now = new Date();
    const register = new Register(
      this.idGenerator.newId(),
      ctx.tenantId,
      input.name,
      input.defaultWarehouseId || null,
      input.defaultBankAccountId || null,
      "ACTIVE",
      now,
      now
    );

    // Save to database
    await this.registerRepo.save(register);

    return ok({
      registerId: register.id,
      workspaceId: register.workspaceId,
      name: register.name,
      status: register.status,
      defaultWarehouseId: register.defaultWarehouseId,
      defaultBankAccountId: register.defaultBankAccountId,
    });
  }
}
