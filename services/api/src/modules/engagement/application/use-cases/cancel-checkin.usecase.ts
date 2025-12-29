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
import { type CancelCheckInEventInput, type CancelCheckInEventOutput } from "@kerniflow/contracts";
import { toCheckInEventDto } from "../mappers/engagement-dto.mappers";
import type { CheckInRepositoryPort } from "../ports/checkin-repository.port";

type Deps = { logger: LoggerPort; checkins: CheckInRepositoryPort };

export class CancelCheckInEventUseCase extends BaseUseCase<
  CancelCheckInEventInput,
  CancelCheckInEventOutput
> {
  constructor(private readonly deps: Deps) {
    super({ logger: deps.logger });
  }

  protected async handle(
    input: CancelCheckInEventInput,
    ctx: UseCaseContext
  ): Promise<Result<CancelCheckInEventOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId is required"));
    }

    const existing = await this.deps.checkins.findById(ctx.tenantId, input.checkInEventId);
    if (!existing) {
      return err(new NotFoundError("Check-in not found"));
    }

    const updated = {
      ...existing,
      status: "CANCELED" as const,
      notes: input.reason ?? existing.notes ?? null,
      updatedAt: new Date(),
    };
    await this.deps.checkins.update(updated);

    return ok({ checkInEvent: toCheckInEventDto(updated) });
  }
}
