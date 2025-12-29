import { Inject, Injectable } from "@nestjs/common";
import type { CreateRegisterInput, CreateRegisterOutput } from "@kerniflow/contracts";
import { BaseUseCase, type Context, type Result, Ok, Err, ConflictError } from "@kerniflow/kernel";
import { Register } from "../../domain/register.aggregate";
import {
  REGISTER_REPOSITORY_PORT,
  type RegisterRepositoryPort,
} from "../ports/register-repository.port";
import type { IdGenerator } from "../../../../shared/ports/id-generator.port";
import { ID_GENERATOR_TOKEN } from "../../../../shared/ports/id-generator.port";

interface CreateRegisterDeps {
  registerRepo: RegisterRepositoryPort;
  idGenerator: IdGenerator;
}

@Injectable()
export class CreateRegisterUseCase extends BaseUseCase<CreateRegisterInput, CreateRegisterOutput> {
  constructor(
    @Inject(REGISTER_REPOSITORY_PORT) private registerRepo: RegisterRepositoryPort,
    @Inject(ID_GENERATOR_TOKEN) private idGenerator: IdGenerator
  ) {
    super();
  }

  async executeImpl(
    input: CreateRegisterInput,
    ctx: Context
  ): Promise<Result<CreateRegisterOutput>> {
    // Check if name already exists
    const exists = await this.registerRepo.existsByName(ctx.workspaceId, input.name);
    if (exists) {
      return Err(
        new ConflictError(
          "REGISTER_NAME_EXISTS",
          `Register with name '${input.name}' already exists`
        )
      );
    }

    // Create register aggregate
    const now = new Date();
    const register = new Register(
      this.idGenerator.generate(),
      ctx.workspaceId,
      input.name,
      input.defaultWarehouseId || null,
      input.defaultBankAccountId || null,
      "ACTIVE",
      now,
      now
    );

    // Save to database
    await this.registerRepo.save(register);

    return Ok({
      registerId: register.id,
      workspaceId: register.workspaceId,
      name: register.name,
      status: register.status,
      defaultWarehouseId: register.defaultWarehouseId,
      defaultBankAccountId: register.defaultBankAccountId,
    });
  }
}
