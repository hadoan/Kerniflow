import {
  BaseUseCase,
  ClockPort,
  IdGeneratorPort,
  LoggerPort,
  Result,
  TimeService,
  UseCaseContext,
  UseCaseError,
  ValidationError,
  err,
  ok,
} from "@kerniflow/kernel";
import { CreateInvoiceInput, CreateInvoiceOutput } from "@kerniflow/contracts";
import { InvoiceRepoPort } from "../../ports/invoice-repo.port";
import { InvoiceAggregate } from "../../../domain/invoice.aggregate";
import { toInvoiceDto } from "../shared/invoice-dto.mapper";

type Deps = {
  logger: LoggerPort;
  invoiceRepo: InvoiceRepoPort;
  idGenerator: IdGeneratorPort;
  clock: ClockPort;
  timeService: TimeService;
};

export class CreateInvoiceUseCase extends BaseUseCase<CreateInvoiceInput, CreateInvoiceOutput> {
  constructor(private readonly useCaseDeps: Deps) {
    super({ logger: useCaseDeps.logger });
  }

  protected validate(input: CreateInvoiceInput): CreateInvoiceInput {
    if (!input.customerId) {
      throw new ValidationError("customerId is required");
    }
    if (!input.currency) {
      throw new ValidationError("currency is required");
    }
    if (!Array.isArray(input.lineItems) || input.lineItems.length === 0) {
      throw new ValidationError("At least one line item is required");
    }
    return input;
  }

  protected async handle(
    input: CreateInvoiceInput,
    ctx: UseCaseContext
  ): Promise<Result<CreateInvoiceOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId missing from context"));
    }

    const createdAt = this.useCaseDeps.clock.now();
    const invoiceDate =
      input.invoiceDate ?? (await this.useCaseDeps.timeService.todayInTenant(ctx.tenantId));
    const dueDate = input.dueDate ?? null;
    const invoiceId = this.useCaseDeps.idGenerator.newId();
    const lines = input.lineItems.map((line) => ({
      id: this.useCaseDeps.idGenerator.newId(),
      description: line.description,
      qty: line.qty,
      unitPriceCents: line.unitPriceCents,
    }));

    const aggregate = InvoiceAggregate.createDraft({
      id: invoiceId,
      tenantId: ctx.tenantId,
      customerId: input.customerId,
      currency: input.currency,
      notes: input.notes,
      terms: input.terms,
      invoiceDate,
      dueDate,
      lineItems: lines,
      createdAt,
    });

    await this.useCaseDeps.invoiceRepo.create(ctx.tenantId, aggregate);

    return ok({ invoice: toInvoiceDto(aggregate) });
  }
}
