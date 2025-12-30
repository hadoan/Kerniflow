import { Injectable } from "@nestjs/common";
import {
  BaseUseCase,
  type LoggerPort,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ValidationError,
  ok,
  err,
} from "@corely/kernel";
import type { ListDealsInput, ListDealsOutput } from "@corely/contracts";
import type { DealRepoPort } from "../../ports/deal-repository.port";
import { toDealDto } from "../../mappers/deal-dto.mapper";

@Injectable()
export class ListDealsUseCase extends BaseUseCase<ListDealsInput, ListDealsOutput> {
  constructor(
    private readonly dealRepo: DealRepoPort,
    logger: LoggerPort
  ) {
    super({ logger });
  }

  protected validate(input: ListDealsInput): ListDealsInput {
    return input;
  }

  protected async handle(
    input: ListDealsInput,
    ctx: UseCaseContext
  ): Promise<Result<ListDealsOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId is required"));
    }

    const filters = {
      partyId: input.partyId,
      stageId: input.stageId,
      status: input.status,
      ownerUserId: input.ownerUserId,
    };

    const result = await this.dealRepo.list(ctx.tenantId, filters, input.limit, input.cursor);

    return ok({
      items: result.items.map(toDealDto),
      nextCursor: result.nextCursor ?? null,
    });
  }
}
