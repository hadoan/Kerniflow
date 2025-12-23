import {
  BaseUseCase,
  LoggerPort,
  NotFoundError,
  Result,
  UseCaseContext,
  UseCaseError,
  ValidationError,
  err,
  ok,
} from "@kerniflow/kernel";
import { GetCustomerInput, GetCustomerOutput } from "@kerniflow/contracts";
import { PartyRepoPort } from "../../ports/party-repo.port";
import { toCustomerDto } from "../../mappers/customer-dto.mapper";

type Deps = { logger: LoggerPort; partyRepo: PartyRepoPort };

export class GetCustomerByIdUseCase extends BaseUseCase<GetCustomerInput, GetCustomerOutput> {
  constructor(private readonly useCaseDeps: Deps) {
    super({ logger: useCaseDeps.logger });
  }

  protected async handle(
    input: GetCustomerInput,
    ctx: UseCaseContext
  ): Promise<Result<GetCustomerOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId is required"));
    }

    const existing = await this.useCaseDeps.partyRepo.findCustomerById(ctx.tenantId, input.id);
    if (!existing) {
      return err(new NotFoundError("Customer not found"));
    }

    return ok({ customer: toCustomerDto(existing) });
  }
}
