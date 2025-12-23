import {
  BaseUseCase,
  ClockPort,
  LoggerPort,
  NotFoundError,
  Result,
  UseCaseContext,
  UseCaseError,
  ValidationError,
  err,
  ok,
} from "@kerniflow/kernel";
import { ArchiveCustomerInput, ArchiveCustomerOutput } from "@kerniflow/contracts";
import { PartyRepoPort } from "../../ports/party-repo.port";
import { toCustomerDto } from "../../mappers/customer-dto.mapper";

type Deps = { logger: LoggerPort; partyRepo: PartyRepoPort; clock: ClockPort };

export class ArchiveCustomerUseCase extends BaseUseCase<
  ArchiveCustomerInput,
  ArchiveCustomerOutput
> {
  constructor(private readonly useCaseDeps: Deps) {
    super({ logger: useCaseDeps.logger });
  }

  protected async handle(
    input: ArchiveCustomerInput,
    ctx: UseCaseContext
  ): Promise<Result<ArchiveCustomerOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId is required"));
    }

    const existing = await this.useCaseDeps.partyRepo.findCustomerById(ctx.tenantId, input.id);
    if (!existing) {
      return err(new NotFoundError("Customer not found"));
    }

    existing.archive(this.useCaseDeps.clock.now());
    await this.useCaseDeps.partyRepo.updateCustomer(ctx.tenantId, existing);
    return ok({ customer: toCustomerDto(existing) });
  }
}
