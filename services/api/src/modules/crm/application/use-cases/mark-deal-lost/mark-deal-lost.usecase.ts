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
import type { MarkDealLostInput, MarkDealLostOutput } from "@corely/contracts";
import type { DealRepoPort } from "../../ports/deal-repository.port";
import { toDealDto } from "../../mappers/deal-dto.mapper";

@Injectable()
export class MarkDealLostUseCase extends BaseUseCase<MarkDealLostInput, MarkDealLostOutput> {
  constructor(
    private readonly dealRepo: DealRepoPort,
    private readonly clock: ClockPort,
    logger: LoggerPort
  ) {
    super({ logger });
  }

  protected validate(input: MarkDealLostInput): MarkDealLostInput {
    if (!input.dealId) {
      throw new ValidationError("dealId is required");
    }
    return input;
  }

  protected async handle(
    input: MarkDealLostInput,
    ctx: UseCaseContext
  ): Promise<Result<MarkDealLostOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId is required"));
    }

    const deal = await this.dealRepo.findById(ctx.tenantId, input.dealId);
    if (!deal) {
      return err(new NotFoundError(`Deal ${input.dealId} not found`));
    }

    const now = this.clock.now();
    deal.markLost(now, input.reason ?? null, now);

    await this.dealRepo.update(ctx.tenantId, deal);

    return ok({ deal: toDealDto(deal) });
  }
}
