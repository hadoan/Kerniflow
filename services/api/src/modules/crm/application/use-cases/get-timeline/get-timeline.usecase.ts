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
import type { GetTimelineInput, GetTimelineOutput } from "@corely/contracts";
import type { ActivityRepoPort } from "../../ports/activity-repository.port";

@Injectable()
export class GetTimelineUseCase extends BaseUseCase<GetTimelineInput, GetTimelineOutput> {
  constructor(
    private readonly activityRepo: ActivityRepoPort,
    logger: LoggerPort
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
      input.limit,
      input.cursor
    );

    const items = result.items.map((item) => ({
      ...item,
      timestamp: item.timestamp.toISOString(),
    }));

    return ok({
      items,
      nextCursor: result.nextCursor ?? null,
    });
  }
}
