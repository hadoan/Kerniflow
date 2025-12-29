import { Inject, Injectable } from "@nestjs/common";
import { ok, err, Result } from "neverthrow";
import type { Logger } from "@kerniflow/kernel";
import { LOGGER } from "@kerniflow/kernel";
import type { UpdateActivityInput, UpdateActivityOutput } from "@kerniflow/contracts";
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
export class UpdateActivityUseCase extends BaseUseCase<UpdateActivityInput, UpdateActivityOutput> {
  constructor(
    @Inject(ACTIVITY_REPO_PORT) private readonly activityRepo: ActivityRepoPort,
    @Inject(CLOCK_PORT) private readonly clock: ClockPort,
    @Inject(LOGGER) logger: Logger
  ) {
    super({ logger });
  }

  protected validate(input: UpdateActivityInput): UpdateActivityInput {
    if (!input.activityId) {
      throw new ValidationError("activityId is required");
    }
    if (input.subject !== undefined && !input.subject.trim()) {
      throw new ValidationError("Activity subject cannot be empty");
    }
    return input;
  }

  protected async handle(
    input: UpdateActivityInput,
    ctx: UseCaseContext
  ): Promise<Result<UpdateActivityOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId is required"));
    }

    const activity = await this.activityRepo.findById(ctx.tenantId, input.activityId);
    if (!activity) {
      return err(new NotFoundError(`Activity ${input.activityId} not found`));
    }

    const now = this.clock.now();
    activity.updateActivity(
      {
        subject: input.subject,
        body: input.body,
        dueAt: input.dueAt ? new Date(input.dueAt) : undefined,
        assignedToUserId: input.assignedToUserId,
      },
      now
    );

    await this.activityRepo.update(ctx.tenantId, activity);

    return ok({ activity: toActivityDto(activity) });
  }
}
