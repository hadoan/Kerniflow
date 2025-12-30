import { Injectable } from "@nestjs/common";
import {
  BaseUseCase,
  type LoggerPort,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ValidationError,
  NotFoundError,
  ok,
  err,
} from "@corely/kernel";
import type { GetDealInput, GetDealOutput } from "@corely/contracts";
import type { DealRepoPort } from "../../ports/deal-repository.port";
import { toDealDto } from "../../mappers/deal-dto.mapper";

@Injectable()
export class GetDealByIdUseCase extends BaseUseCase<GetDealInput, GetDealOutput> {
  constructor(
    private readonly dealRepo: DealRepoPort,
    logger: LoggerPort
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
