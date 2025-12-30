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
import type { MarkDealWonInput, MarkDealWonOutput } from "@corely/contracts";
import type { DealRepoPort } from "../../ports/deal-repository.port";
import { toDealDto } from "../../mappers/deal-dto.mapper";

@Injectable()
export class MarkDealWonUseCase extends BaseUseCase<MarkDealWonInput, MarkDealWonOutput> {
  constructor(
    private readonly dealRepo: DealRepoPort,
    private readonly clock: ClockPort,
    logger: LoggerPort
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
    deal.markWon(now, now);

    await this.dealRepo.update(ctx.tenantId, deal);

    return ok({ deal: toDealDto(deal) });
  }
}
