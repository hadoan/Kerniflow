import { Injectable } from "@nestjs/common";
import {
  BaseUseCase,
  type ClockPort,
  type LoggerPort,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ValidationError,
  NotFoundError,
  ok,
  err,
} from "@corely/kernel";
import type { UpdateActivityInput, UpdateActivityOutput } from "@corely/contracts";
import type { ActivityRepoPort } from "../../ports/activity-repository.port";
import { toActivityDto } from "../../mappers/activity-dto.mapper";

@Injectable()
export class UpdateActivityUseCase extends BaseUseCase<UpdateActivityInput, UpdateActivityOutput> {
  constructor(
    private readonly activityRepo: ActivityRepoPort,
    private readonly clock: ClockPort,
    logger: LoggerPort
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
