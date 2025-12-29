import {
  BaseUseCase,
  type LoggerPort,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ValidationError,
  NotFoundError,
  ok,
  err,
} from "@kerniflow/kernel";
import {
  type CompleteCheckInEventInput,
  type CompleteCheckInEventOutput,
} from "@kerniflow/contracts";
import { toCheckInEventDto } from "../mappers/engagement-dto.mappers";
import type { CheckInRepositoryPort } from "../ports/checkin-repository.port";

type Deps = { logger: LoggerPort; checkins: CheckInRepositoryPort };

export class CompleteCheckInEventUseCase extends BaseUseCase<
  CompleteCheckInEventInput,
  CompleteCheckInEventOutput
> {
  constructor(private readonly deps: Deps) {
    super({ logger: deps.logger });
  }

  protected async handle(
    input: CompleteCheckInEventInput,
    ctx: UseCaseContext
  ): Promise<Result<CompleteCheckInEventOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId is required"));
    }

    const existing = await this.deps.checkins.findById(ctx.tenantId, input.checkInEventId);
    if (!existing) {
      return err(new NotFoundError("Check-in not found"));
    }

    const updated = {
      ...existing,
      status: "COMPLETED" as const,
      updatedAt: new Date(),
    };
    await this.deps.checkins.update(updated);

    return ok({ checkInEvent: toCheckInEventDto(updated) });
  }
}
