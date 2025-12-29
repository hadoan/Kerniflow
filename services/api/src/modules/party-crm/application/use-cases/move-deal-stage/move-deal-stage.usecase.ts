import { Inject, Injectable } from "@nestjs/common";
import { ok, err, Result } from "neverthrow";
import type { Logger } from "@kerniflow/kernel";
import { LOGGER } from "@kerniflow/kernel";
import type { MoveDealStageInput, MoveDealStageOutput } from "@kerniflow/contracts";
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
export class MoveDealStageUseCase extends BaseUseCase<MoveDealStageInput, MoveDealStageOutput> {
  constructor(
    @Inject(DEAL_REPO_PORT) private readonly dealRepo: DealRepoPort,
    @Inject(CLOCK_PORT) private readonly clock: ClockPort,
    @Inject(LOGGER) logger: Logger
  ) {
    super({ logger });
  }

  protected validate(input: MoveDealStageInput): MoveDealStageInput {
    if (!input.dealId) {
      throw new ValidationError("dealId is required");
    }
    if (!input.newStageId) {
      throw new ValidationError("newStageId is required");
    }
    return input;
  }

  protected async handle(
    input: MoveDealStageInput,
    ctx: UseCaseContext
  ): Promise<Result<MoveDealStageOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId is required"));
    }

    const deal = await this.dealRepo.findById(ctx.tenantId, input.dealId);
    if (!deal) {
      return err(new NotFoundError(`Deal ${input.dealId} not found`));
    }

    const now = this.clock.now();
    const previousStageId = deal.stageId;

    deal.moveToStage(input.newStageId, now);

    await this.dealRepo.update(ctx.tenantId, deal);
    await this.dealRepo.recordStageTransition({
      tenantId: ctx.tenantId,
      dealId: deal.id,
      fromStageId: previousStageId,
      toStageId: input.newStageId,
      transitionedByUserId: ctx.userId ?? null,
      transitionedAt: now,
    });

    return ok({ deal: toDealDto(deal) });
  }
}
