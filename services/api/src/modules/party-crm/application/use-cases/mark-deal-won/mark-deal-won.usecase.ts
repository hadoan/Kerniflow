import { Inject, Injectable } from "@nestjs/common";
import { ok, err, Result } from "neverthrow";
import type { Logger } from "@kerniflow/kernel";
import { LOGGER } from "@kerniflow/kernel";
import type { MarkDealWonInput, MarkDealWonOutput } from "@kerniflow/contracts";
import {
  BaseUseCase,
  UseCaseContext,
  UseCaseError,
  ValidationError,
  NotFoundError,
} from "@/shared/application";
import type { ClockPort } from "@/shared/ports/clock.port";
import { CLOCK_PORT } from "@/shared/ports/clock.port";
import type { DealRepoPort } from "../../ports/deal-repository.port";
import { DEAL_REPO_PORT } from "../../ports/deal-repository.port";
import { toDealDto } from "../../mappers/deal-dto.mapper";

type Deps = {
  dealRepo: DealRepoPort;
  clock: ClockPort;
  logger: Logger;
};

@Injectable()
export class MarkDealWonUseCase extends BaseUseCase<MarkDealWonInput, MarkDealWonOutput> {
  constructor(
    @Inject(DEAL_REPO_PORT) private readonly dealRepo: DealRepoPort,
    @Inject(CLOCK_PORT) private readonly clock: ClockPort,
    @Inject(LOGGER) logger: Logger
  ) {
    super({ logger });
  }

  protected validate(input: MarkDealWonInput): MarkDealWonInput {
    if (!input.dealId) {
      throw new ValidationError("dealId is required");
    }
    return input;
  }

  protected async handle(
    input: MarkDealWonInput,
    ctx: UseCaseContext
  ): Promise<Result<MarkDealWonOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId is required"));
    }

    const deal = await this.dealRepo.findById(ctx.tenantId, input.dealId);
    if (!deal) {
      return err(new NotFoundError(`Deal ${input.dealId} not found`));
    }

    const now = this.clock.now();
    const wonAt = input.wonAt ? new Date(input.wonAt) : now;

    deal.markWon(wonAt, now);

    await this.dealRepo.update(ctx.tenantId, deal);

    return ok({ deal: toDealDto(deal) });
  }
}
