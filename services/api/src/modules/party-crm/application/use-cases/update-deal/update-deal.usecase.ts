import { Inject, Injectable } from "@nestjs/common";
import { ok, err, Result } from "neverthrow";
import type { Logger } from "@kerniflow/kernel";
import { LOGGER } from "@kerniflow/kernel";
import type { UpdateDealInput, UpdateDealOutput } from "@kerniflow/contracts";
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
export class UpdateDealUseCase extends BaseUseCase<UpdateDealInput, UpdateDealOutput> {
  constructor(
    @Inject(DEAL_REPO_PORT) private readonly dealRepo: DealRepoPort,
    @Inject(CLOCK_PORT) private readonly clock: ClockPort,
    @Inject(LOGGER) logger: Logger
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
        expectedCloseDate: input.expectedCloseDate,
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
