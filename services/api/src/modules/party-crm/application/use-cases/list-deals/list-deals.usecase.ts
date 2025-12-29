import { Inject, Injectable } from "@nestjs/common";
import { ok, err, Result } from "neverthrow";
import type { Logger } from "@kerniflow/kernel";
import { LOGGER } from "@kerniflow/kernel";
import type { ListDealsInput, ListDealsOutput } from "@kerniflow/contracts";
import { BaseUseCase, UseCaseContext, UseCaseError, ValidationError } from "@/shared/application";
import type { DealRepoPort } from "../../ports/deal-repository.port";
import { DEAL_REPO_PORT } from "../../ports/deal-repository.port";
import { toDealDto } from "../../mappers/deal-dto.mapper";

type Deps = {
  dealRepo: DealRepoPort;
  logger: Logger;
};

@Injectable()
export class ListDealsUseCase extends BaseUseCase<ListDealsInput, ListDealsOutput> {
  constructor(
    @Inject(DEAL_REPO_PORT) private readonly dealRepo: DealRepoPort,
    @Inject(LOGGER) logger: Logger
  ) {
    super({ logger });
  }

  protected validate(input: ListDealsInput): ListDealsInput {
    return input;
  }

  protected async handle(
    input: ListDealsInput,
    ctx: UseCaseContext
  ): Promise<Result<ListDealsOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId is required"));
    }

    const filters = {
      partyId: input.partyId,
      stageId: input.stageId,
      status: input.status,
      ownerUserId: input.ownerUserId,
    };

    const result = await this.dealRepo.list(ctx.tenantId, filters, input.pageSize, input.cursor);

    return ok({
      deals: result.deals.map(toDealDto),
      nextCursor: result.nextCursor,
    });
  }
}
