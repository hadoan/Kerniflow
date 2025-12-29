import { Inject, Injectable } from "@nestjs/common";
import { ok, err, Result } from "neverthrow";
import type { Logger } from "@kerniflow/kernel";
import { LOGGER } from "@kerniflow/kernel";
import type { CreateActivityInput, CreateActivityOutput } from "@kerniflow/contracts";
import { BaseUseCase, UseCaseContext, UseCaseError, ValidationError } from "@/shared/application";
import type { ClockPort } from "@/shared/ports/clock.port";
import { CLOCK_PORT } from "@/shared/ports/clock.port";
import type { IdGeneratorPort } from "@/shared/ports/id-generator.port";
import { ID_GENERATOR_PORT } from "@/shared/ports/id-generator.port";
import type { ActivityRepoPort } from "../../ports/activity-repository.port";
import { ACTIVITY_REPO_PORT } from "../../ports/activity-repository.port";
import { ActivityEntity } from "../../../domain/activity.entity";
import { toActivityDto } from "../../mappers/activity-dto.mapper";

type Deps = {
  activityRepo: ActivityRepoPort;
  clock: ClockPort;
  idGenerator: IdGeneratorPort;
  logger: Logger;
};

@Injectable()
export class CreateActivityUseCase extends BaseUseCase<CreateActivityInput, CreateActivityOutput> {
  constructor(
    @Inject(ACTIVITY_REPO_PORT) private readonly activityRepo: ActivityRepoPort,
    @Inject(CLOCK_PORT) private readonly clock: ClockPort,
    @Inject(ID_GENERATOR_PORT) private readonly idGenerator: IdGeneratorPort,
    @Inject(LOGGER) logger: Logger
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
