import { Injectable } from "@nestjs/common";
import {
  BaseUseCase,
  type ClockPort,
  type IdGeneratorPort,
  type LoggerPort,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ValidationError,
  ok,
  err,
} from "@corely/kernel";
import type { LogMessageInput, LogMessageOutput } from "@corely/contracts";
import type { ActivityRepoPort } from "../../ports/activity-repository.port";
import { ActivityEntity } from "../../../domain/activity.entity";
import { toActivityDto } from "../../mappers/activity-dto.mapper";

const SAFE_SCHEMES = ["https://", "mailto:"];

@Injectable()
export class LogMessageUseCase extends BaseUseCase<LogMessageInput, LogMessageOutput> {
  constructor(
    private readonly activityRepo: ActivityRepoPort,
    private readonly clock: ClockPort,
    private readonly idGenerator: IdGeneratorPort,
    logger: LoggerPort
  ) {
    super({ logger });
  }

  protected validate(input: LogMessageInput): LogMessageInput {
    if (!input.dealId) {
      throw new ValidationError("dealId is required");
    }
    if (!input.channelKey) {
      throw new ValidationError("channelKey is required");
    }
    if (input.openUrl) {
      const lower = input.openUrl.toLowerCase();
      if (!SAFE_SCHEMES.some((scheme) => lower.startsWith(scheme))) {
        throw new ValidationError("Invalid URL scheme");
      }
    }
    return input;
  }

  protected async handle(
    input: LogMessageInput,
    ctx: UseCaseContext
  ): Promise<Result<LogMessageOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId is required"));
    }

    const now = this.clock.now();
    const activity = ActivityEntity.create({
      id: this.idGenerator.newId(),
      tenantId: ctx.tenantId,
      type: "NOTE",
      subject: input.subject || `${input.channelKey} message`,
      body: input.body ?? null,
      channelKey: input.channelKey,
      messageDirection: input.direction ?? "outbound",
      messageTo: input.to ?? null,
      openUrl: input.openUrl ?? null,
      partyId: null,
      dealId: input.dealId,
      dueAt: null,
      assignedToUserId: ctx.userId ?? null,
      createdByUserId: ctx.userId ?? null,
      createdAt: now,
    });

    await this.activityRepo.create(ctx.tenantId, activity);

    return ok({ activity: toActivityDto(activity) });
  }
}
