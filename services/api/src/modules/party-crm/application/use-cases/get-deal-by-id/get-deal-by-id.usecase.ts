import { Inject, Injectable } from "@nestjs/common";
import { ok, err, Result } from "neverthrow";
import type { Logger } from "@kerniflow/kernel";
import { LOGGER } from "@kerniflow/kernel";
import type { GetDealInput, GetDealOutput } from "@kerniflow/contracts";
import {
  BaseUseCase,
  UseCaseContext,
  UseCaseError,
  ValidationError,
  NotFoundError,
} from "@/shared/application";
import type { DealRepoPort } from "../../ports/deal-repository.port";
import { DEAL_REPO_PORT } from "../../ports/deal-repository.port";
import { toDealDto } from "../../mappers/deal-dto.mapper";

type Deps = {
  dealRepo: DealRepoPort;
  logger: Logger;
};

@Injectable()
export class GetDealByIdUseCase extends BaseUseCase<GetDealInput, GetDealOutput> {
  constructor(
    @Inject(DEAL_REPO_PORT) private readonly dealRepo: DealRepoPort,
    @Inject(LOGGER) logger: Logger
  ) {
    super({ logger });
  }

  protected validate(input: GetDealInput): GetDealInput {
    if (!input.dealId) {
      throw new ValidationError("dealId is required");
    }
    return input;
  }

  protected async handle(
    input: GetDealInput,
    ctx: UseCaseContext
  ): Promise<Result<GetDealOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId is required"));
    }

    const deal = await this.dealRepo.findById(ctx.tenantId, input.dealId);
    if (!deal) {
      return err(new NotFoundError(`Deal ${input.dealId} not found`));
    }

    return ok({ deal: toDealDto(deal) });
  }
}
