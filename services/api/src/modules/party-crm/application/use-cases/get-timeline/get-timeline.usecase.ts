import { Inject, Injectable } from "@nestjs/common";
import { ok, err, Result } from "neverthrow";
import type { Logger } from "@kerniflow/kernel";
import { LOGGER } from "@kerniflow/kernel";
import type { GetTimelineInput, GetTimelineOutput } from "@kerniflow/contracts";
import { BaseUseCase, UseCaseContext, UseCaseError, ValidationError } from "@/shared/application";
import type { ActivityRepoPort } from "../../ports/activity-repository.port";
import { ACTIVITY_REPO_PORT } from "../../ports/activity-repository.port";

type Deps = {
  activityRepo: ActivityRepoPort;
  logger: Logger;
};

@Injectable()
export class GetTimelineUseCase extends BaseUseCase<GetTimelineInput, GetTimelineOutput> {
  constructor(
    @Inject(ACTIVITY_REPO_PORT) private readonly activityRepo: ActivityRepoPort,
    @Inject(LOGGER) logger: Logger
  ) {
    super({ logger });
  }

  protected validate(input: GetTimelineInput): GetTimelineInput {
    if (!input.entityId) {
      throw new ValidationError("entityId is required");
    }
    if (!input.entityType || !["party", "deal"].includes(input.entityType)) {
      throw new ValidationError("entityType must be 'party' or 'deal'");
    }
    return input;
  }

  protected async handle(
    input: GetTimelineInput,
    ctx: UseCaseContext
  ): Promise<Result<GetTimelineOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId is required"));
    }

    const result = await this.activityRepo.getTimeline(
      ctx.tenantId,
      input.entityType,
      input.entityId,
      input.pageSize,
      input.cursor
    );

    return ok({
      items: result.items,
      nextCursor: result.nextCursor,
    });
  }
}
