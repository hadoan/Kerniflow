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
import type { CompleteActivityInput, CompleteActivityOutput } from "@corely/contracts";
import type { ActivityRepoPort } from "../../ports/activity-repository.port";
import { toActivityDto } from "../../mappers/activity-dto.mapper";

@Injectable()
export class CompleteActivityUseCase extends BaseUseCase<
  CompleteActivityInput,
  CompleteActivityOutput
> {
  constructor(
    private readonly activityRepo: ActivityRepoPort,
    private readonly clock: ClockPort,
    logger: LoggerPort
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
    activity.complete(now, now);

    await this.activityRepo.update(ctx.tenantId, activity);

    return ok({ activity: toActivityDto(activity) });
  }
}
