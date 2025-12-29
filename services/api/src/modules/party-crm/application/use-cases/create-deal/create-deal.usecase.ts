import { Inject, Injectable } from "@nestjs/common";
import { ok, err, Result } from "neverthrow";
import type { Logger } from "@kerniflow/kernel";
import { LOGGER } from "@kerniflow/kernel";
import type { CreateDealInput, CreateDealOutput } from "@kerniflow/contracts";
import { BaseUseCase, UseCaseContext, UseCaseError, ValidationError } from "@/shared/application";
import type { ClockPort } from "@/shared/ports/clock.port";
import { CLOCK_PORT } from "@/shared/ports/clock.port";
import type { IdGeneratorPort } from "@/shared/ports/id-generator.port";
import { ID_GENERATOR_PORT } from "@/shared/ports/id-generator.port";
import type { DealRepoPort } from "../../ports/deal-repository.port";
import { DEAL_REPO_PORT } from "../../ports/deal-repository.port";
import { DealAggregate } from "../../../domain/deal.aggregate";
import { toDealDto } from "../../mappers/deal-dto.mapper";

type Deps = {
  dealRepo: DealRepoPort;
  clock: ClockPort;
  idGenerator: IdGeneratorPort;
  logger: Logger;
};

@Injectable()
export class CreateDealUseCase extends BaseUseCase<CreateDealInput, CreateDealOutput> {
  constructor(
    @Inject(DEAL_REPO_PORT) private readonly dealRepo: DealRepoPort,
    @Inject(CLOCK_PORT) private readonly clock: ClockPort,
    @Inject(ID_GENERATOR_PORT) private readonly idGenerator: IdGeneratorPort,
    @Inject(LOGGER) logger: Logger
  ) {
    super({ logger });
  }

  protected validate(input: CreateDealInput): CreateDealInput {
    if (!input.title.trim()) {
      throw new ValidationError("Deal title is required");
    }
    if (!input.partyId) {
      throw new ValidationError("partyId is required");
    }
    if (!input.stageId) {
      throw new ValidationError("stageId is required");
    }
    if (input.probability !== undefined && input.probability !== null) {
      if (input.probability < 0 || input.probability > 100) {
        throw new ValidationError("Probability must be between 0 and 100");
      }
    }
    return input;
  }

  protected async handle(
    input: CreateDealInput,
    ctx: UseCaseContext
  ): Promise<Result<CreateDealOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId is required"));
    }

    const now = this.clock.now();
    const deal = DealAggregate.createDeal({
      id: this.idGenerator.newId(),
      tenantId: ctx.tenantId,
      title: input.title,
      partyId: input.partyId,
      stageId: input.stageId,
      amountCents: input.amountCents,
      currency: input.currency,
      expectedCloseDate: input.expectedCloseDate,
      probability: input.probability,
      ownerUserId: input.ownerUserId ?? ctx.userId ?? null,
      notes: input.notes,
      tags: input.tags,
      createdAt: now,
    });

    await this.dealRepo.create(ctx.tenantId, deal);

    return ok({ deal: toDealDto(deal) });
  }
}
