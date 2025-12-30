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
  parseLocalDate,
} from "@corely/kernel";
import type { UpdateDealInput, UpdateDealOutput } from "@corely/contracts";
import type { DealRepoPort } from "../../ports/deal-repository.port";
import { toDealDto } from "../../mappers/deal-dto.mapper";

@Injectable()
export class UpdateDealUseCase extends BaseUseCase<UpdateDealInput, UpdateDealOutput> {
  constructor(
    private readonly dealRepo: DealRepoPort,
    private readonly clock: ClockPort,
    logger: LoggerPort
  ) {
    super({ logger });
  }

  protected validate(input: UpdateDealInput): UpdateDealInput {
    if (!input.dealId) {
      throw new ValidationError("dealId is required");
    }
    if (input.title !== undefined && !input.title.trim()) {
      throw new ValidationError("Deal title cannot be empty");
    }
    if (input.probability !== undefined && input.probability !== null) {
      if (input.probability < 0 || input.probability > 100) {
        throw new ValidationError("Probability must be between 0 and 100");
      }
    }
    return input;
  }

  protected async handle(
    input: UpdateDealInput,
    ctx: UseCaseContext
  ): Promise<Result<UpdateDealOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId is required"));
    }

    const deal = await this.dealRepo.findById(ctx.tenantId, input.dealId);
    if (!deal) {
      return err(new NotFoundError(`Deal ${input.dealId} not found`));
    }

    const now = this.clock.now();
    deal.updateDeal(
      {
        title: input.title,
        partyId: input.partyId,
        amountCents: input.amountCents,
        currency: input.currency,
        expectedCloseDate: input.expectedCloseDate
          ? parseLocalDate(input.expectedCloseDate)
          : undefined,
        probability: input.probability,
        ownerUserId: input.ownerUserId,
        notes: input.notes,
        tags: input.tags,
      },
      now
    );

    await this.dealRepo.update(ctx.tenantId, deal);

    return ok({ deal: toDealDto(deal) });
  }
}
