import { Inject, Injectable } from "@nestjs/common";
import { ok, err, Result } from "neverthrow";
import type { Logger } from "@kerniflow/kernel";
import { LOGGER } from "@kerniflow/kernel";
import type { ListActivitiesInput, ListActivitiesOutput } from "@kerniflow/contracts";
import { BaseUseCase, UseCaseContext, UseCaseError, ValidationError } from "@/shared/application";
import type { ActivityRepoPort } from "../../ports/activity-repository.port";
import { ACTIVITY_REPO_PORT } from "../../ports/activity-repository.port";
import { toActivityDto } from "../../mappers/activity-dto.mapper";

type Deps = {
  activityRepo: ActivityRepoPort;
  logger: Logger;
};

@Injectable()
export class ListActivitiesUseCase extends BaseUseCase<ListActivitiesInput, ListActivitiesOutput> {
  constructor(
    @Inject(ACTIVITY_REPO_PORT) private readonly activityRepo: ActivityRepoPort,
    @Inject(LOGGER) logger: Logger
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

    const result = await this.activityRepo.list(
      ctx.tenantId,
      filters,
      input.pageSize,
      input.cursor
    );

    return ok({
      activities: result.activities.map(toActivityDto),
      nextCursor: result.nextCursor,
    });
  }
}
