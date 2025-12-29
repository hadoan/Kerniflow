import { Inject, Injectable } from "@nestjs/common";
import { ok, err, Result } from "neverthrow";
import type { Logger } from "@kerniflow/kernel";
import { LOGGER } from "@kerniflow/kernel";
import type { CompleteActivityInput, CompleteActivityOutput } from "@kerniflow/contracts";
import {
  BaseUseCase,
  UseCaseContext,
  UseCaseError,
  ValidationError,
  NotFoundError,
} from "@/shared/application";
import type { ClockPort } from "@/shared/ports/clock.port";
import { CLOCK_PORT } from "@/shared/ports/clock.port";
import type { ActivityRepoPort } from "../../ports/activity-repository.port";
import { ACTIVITY_REPO_PORT } from "../../ports/activity-repository.port";
import { toActivityDto } from "../../mappers/activity-dto.mapper";

type Deps = {
  activityRepo: ActivityRepoPort;
  clock: ClockPort;
  logger: Logger;
};

@Injectable()
export class CompleteActivityUseCase extends BaseUseCase<
  CompleteActivityInput,
  CompleteActivityOutput
> {
  constructor(
    @Inject(ACTIVITY_REPO_PORT) private readonly activityRepo: ActivityRepoPort,
    @Inject(CLOCK_PORT) private readonly clock: ClockPort,
    @Inject(LOGGER) logger: Logger
  ) {
    super({ logger });
  }

  protected validate(input: CompleteActivityInput): CompleteActivityInput {
    if (!input.activityId) {
      throw new ValidationError("activityId is required");
    }
    return input;
  }

  protected async handle(
    input: CompleteActivityInput,
    ctx: UseCaseContext
  ): Promise<Result<CompleteActivityOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId is required"));
    }

    const activity = await this.activityRepo.findById(ctx.tenantId, input.activityId);
    if (!activity) {
      return err(new NotFoundError(`Activity ${input.activityId} not found`));
    }

    const now = this.clock.now();
    const completedAt = input.completedAt ? new Date(input.completedAt) : now;

    activity.complete(completedAt, now);

    await this.activityRepo.update(ctx.tenantId, activity);

    return ok({ activity: toActivityDto(activity) });
  }
}
