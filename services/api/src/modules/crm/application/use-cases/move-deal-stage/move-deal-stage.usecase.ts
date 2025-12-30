import { Injectable } from "@nestjs/common";
import {
  BaseUseCase,
  type ClockPort,
  type LoggerPort,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ValidationError,
  NotFoundError,
  ok,
  err,
} from "@corely/kernel";
import type { MoveDealStageInput, MoveDealStageOutput } from "@corely/contracts";
import type { DealRepoPort } from "../../ports/deal-repository.port";
import { toDealDto } from "../../mappers/deal-dto.mapper";

@Injectable()
export class MoveDealStageUseCase extends BaseUseCase<MoveDealStageInput, MoveDealStageOutput> {
  constructor(
    private readonly dealRepo: DealRepoPort,
    private readonly clock: ClockPort,
    logger: LoggerPort
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
