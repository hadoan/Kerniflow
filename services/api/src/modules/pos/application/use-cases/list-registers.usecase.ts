import { Inject, Injectable } from "@nestjs/common";
import type { ListRegistersInput, ListRegistersOutput } from "@kerniflow/contracts";
import { BaseUseCase, type Context, type Result, Ok } from "@kerniflow/kernel";
import {
  REGISTER_REPOSITORY_PORT,
  type RegisterRepositoryPort,
} from "../ports/register-repository.port";

@Injectable()
export class ListRegistersUseCase extends BaseUseCase<ListRegistersInput, ListRegistersOutput> {
  constructor(@Inject(REGISTER_REPOSITORY_PORT) private registerRepo: RegisterRepositoryPort) {
    super();
  }

  async executeImpl(input: ListRegistersInput, ctx: Context): Promise<Result<ListRegistersOutput>> {
    const registers = await this.registerRepo.findByWorkspace(ctx.workspaceId, input.status);

    return Ok({
      registers: registers.map((r) => r.toDto()),
    });
  }
}
