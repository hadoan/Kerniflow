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
import type { CreateActivityInput, CreateActivityOutput } from "@corely/contracts";
import type { ActivityRepoPort } from "../../ports/activity-repository.port";
import { ActivityEntity } from "../../../domain/activity.entity";
import { toActivityDto } from "../../mappers/activity-dto.mapper";

@Injectable()
export class CreateActivityUseCase extends BaseUseCase<CreateActivityInput, CreateActivityOutput> {
  constructor(
    private readonly activityRepo: ActivityRepoPort,
    private readonly clock: ClockPort,
    private readonly idGenerator: IdGeneratorPort,
    logger: LoggerPort
  ) {
    super({ logger });
  }

  protected validate(input: CreateActivityInput): CreateActivityInput {
    if (!input.subject.trim()) {
      throw new ValidationError("Activity subject is required");
    }
    if (!input.partyId && !input.dealId) {
      throw new ValidationError("Activity must be associated with either a party or a deal");
    }
    return input;
  }

  protected async handle(
    input: CreateActivityInput,
    ctx: UseCaseContext
  ): Promise<Result<CreateActivityOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId is required"));
    }

    const now = this.clock.now();
    const activity = ActivityEntity.create({
      id: this.idGenerator.newId(),
      tenantId: ctx.tenantId,
      type: input.type,
      subject: input.subject,
      body: input.body,
      partyId: input.partyId,
      dealId: input.dealId,
      dueAt: input.dueAt ? new Date(input.dueAt) : null,
      assignedToUserId: input.assignedToUserId ?? ctx.userId ?? null,
      createdByUserId: ctx.userId ?? null,
      createdAt: now,
    });

    await this.activityRepo.create(ctx.tenantId, activity);

    return ok({ activity: toActivityDto(activity) });
  }
}
