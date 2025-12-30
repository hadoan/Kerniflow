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
import { type ListCheckInEventsInput, type ListCheckInEventsOutput } from "@corely/contracts";
import { toCheckInEventDto } from "../mappers/engagement-dto.mappers";
import type { CheckInRepositoryPort } from "../ports/checkin-repository.port";

type Deps = { logger: LoggerPort; checkins: CheckInRepositoryPort };

export class ListCheckInEventsUseCase extends BaseUseCase<
  ListCheckInEventsInput,
  ListCheckInEventsOutput
> {
  constructor(protected readonly deps: Deps) {
    super({ logger: deps.logger });
  }

  protected async handle(
    input: ListCheckInEventsInput,
    ctx: UseCaseContext
  ): Promise<Result<ListCheckInEventsOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId is required"));
    }

    const pageSize = input.pageSize ?? 50;
    const result = await this.deps.checkins.list(
      ctx.tenantId,
      {
        customerPartyId: input.customerPartyId,
        registerId: input.registerId,
        status: input.status,
        from: input.from,
        to: input.to,
      },
      { cursor: input.cursor, pageSize }
    );

    return ok({
      items: result.items.map(toCheckInEventDto),
      nextCursor: result.nextCursor ?? null,
    });
  }
}
