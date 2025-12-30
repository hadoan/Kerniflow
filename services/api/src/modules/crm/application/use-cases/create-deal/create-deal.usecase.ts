import { Injectable } from "@nestjs/common";
import {
  BaseUseCase,
  type ClockPort,
  type IdGeneratorPort,
  type LoggerPort,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ValidationError,
  parseLocalDate,
  ok,
  err,
} from "@corely/kernel";
import type { CreateDealInput, CreateDealOutput } from "@corely/contracts";
import type { DealRepoPort } from "../../ports/deal-repository.port";
import { DealAggregate } from "../../../domain/deal.aggregate";
import { toDealDto } from "../../mappers/deal-dto.mapper";

@Injectable()
export class CreateDealUseCase extends BaseUseCase<CreateDealInput, CreateDealOutput> {
  constructor(
    private readonly dealRepo: DealRepoPort,
    private readonly clock: ClockPort,
    private readonly idGenerator: IdGeneratorPort,
    logger: LoggerPort
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
      expectedCloseDate: input.expectedCloseDate ? parseLocalDate(input.expectedCloseDate) : null,
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
