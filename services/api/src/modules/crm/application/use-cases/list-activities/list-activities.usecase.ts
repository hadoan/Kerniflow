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
import type { ListActivitiesInput, ListActivitiesOutput } from "@corely/contracts";
import type { ActivityRepoPort } from "../../ports/activity-repository.port";
import { toActivityDto } from "../../mappers/activity-dto.mapper";

@Injectable()
export class ListActivitiesUseCase extends BaseUseCase<ListActivitiesInput, ListActivitiesOutput> {
  constructor(
    private readonly activityRepo: ActivityRepoPort,
    logger: LoggerPort
  ) {
    super({ logger });
  }

  protected validate(input: ListActivitiesInput): ListActivitiesInput {
    return input;
  }

  protected async handle(
    input: ListActivitiesInput,
    ctx: UseCaseContext
  ): Promise<Result<ListActivitiesOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId is required"));
    }

    const filters = {
      partyId: input.partyId,
      dealId: input.dealId,
      type: input.type,
      status: input.status,
      assignedToUserId: input.assignedToUserId,
    };

    const result = await this.activityRepo.list(ctx.tenantId, filters, input.limit, input.cursor);

    return ok({
      items: result.items.map(toActivityDto),
      nextCursor: result.nextCursor ?? null,
    });
  }
}
