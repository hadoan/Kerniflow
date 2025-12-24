import type { UpdateCustomerInput, UpdateCustomerOutput } from "@kerniflow/contracts";
import type {
  ClockPort,
  IdGeneratorPort,
  LoggerPort,
  Result,
  UseCaseContext,
  UseCaseError,
} from "@kerniflow/kernel";
import {
  BaseUseCase,
  ConflictError,
  NotFoundError,
  ValidationError,
  err,
  ok,
} from "@kerniflow/kernel";
import { toCustomerDto } from "../../mappers/customer-dto.mapper";
import type { PartyRepoPort } from "../../ports/party-repository.port";
type Deps = {
  logger: LoggerPort;
  partyRepo: PartyRepoPort;
  idGenerator: IdGeneratorPort;
  clock: ClockPort;
};

export class UpdateCustomerUseCase extends BaseUseCase<UpdateCustomerInput, UpdateCustomerOutput> {
  constructor(private readonly useCaseDeps: Deps) {
    super({ logger: useCaseDeps.logger });
  }

  protected validate(input: UpdateCustomerInput): UpdateCustomerInput {
    if (!input.patch || Object.keys(input.patch).length === 0) {
      throw new ValidationError("Nothing to update");
    }
    return input;
  }

  protected async handle(
    input: UpdateCustomerInput,
    ctx: UseCaseContext
  ): Promise<Result<UpdateCustomerOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId is required"));
    }

    const existing = await this.useCaseDeps.partyRepo.findCustomerById(ctx.tenantId, input.id);
    if (!existing) {
      return err(new NotFoundError("Customer not found"));
    }

    if (existing.archivedAt) {
      return err(new ConflictError("Cannot update an archived customer"));
    }

    try {
      const now = this.useCaseDeps.clock.now();
      existing.updateCustomer(input.patch, now, () => this.useCaseDeps.idGenerator.newId());
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid update";
      return err(new ValidationError(message));
    }

    await this.useCaseDeps.partyRepo.updateCustomer(ctx.tenantId, existing);
    return ok({ customer: toCustomerDto(existing) });
  }
}
