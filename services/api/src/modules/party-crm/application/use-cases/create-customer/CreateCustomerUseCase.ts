import {
  BaseUseCase,
  ClockPort,
  IdGeneratorPort,
  LoggerPort,
  Result,
  UseCaseContext,
  UseCaseError,
  ValidationError,
  err,
  ok,
} from "@kerniflow/kernel";
import { CreateCustomerInput, CreateCustomerOutput } from "@kerniflow/contracts";
import { PartyRepoPort } from "../../ports/party-repo.port";
import { PartyAggregate } from "../../../domain/party.aggregate";
import { toCustomerDto } from "../../mappers/customer-dto.mapper";

type Deps = {
  logger: LoggerPort;
  partyRepo: PartyRepoPort;
  idGenerator: IdGeneratorPort;
  clock: ClockPort;
};

export class CreateCustomerUseCase extends BaseUseCase<CreateCustomerInput, CreateCustomerOutput> {
  constructor(private readonly useCaseDeps: Deps) {
    super({ logger: useCaseDeps.logger });
  }

  protected validate(input: CreateCustomerInput): CreateCustomerInput {
    if (!input.displayName.trim()) {
      throw new ValidationError("displayName is required");
    }
    return input;
  }

  protected async handle(
    input: CreateCustomerInput,
    ctx: UseCaseContext
  ): Promise<Result<CreateCustomerOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId is required"));
    }

    const now = this.useCaseDeps.clock.now();
    const party = PartyAggregate.createCustomer({
      id: this.useCaseDeps.idGenerator.newId(),
      tenantId: ctx.tenantId,
      displayName: input.displayName,
      email: input.email ?? null,
      phone: input.phone ?? null,
      billingAddress: input.billingAddress ?? null,
      vatId: input.vatId ?? null,
      notes: input.notes ?? null,
      tags: input.tags ?? [],
      createdAt: now,
      generateId: () => this.useCaseDeps.idGenerator.newId(),
    });

    await this.useCaseDeps.partyRepo.createCustomer(ctx.tenantId, party);
    return ok({ customer: toCustomerDto(party) });
  }
}
