import {
  BaseUseCase,
  type ClockPort,
  type IdGeneratorPort,
  type LoggerPort,
  NotFoundError,
  type Result,
  type TimeService,
  type UseCaseContext,
  type UseCaseError,
  ValidationError,
  err,
  ok,
  parseLocalDate,
} from "@corely/kernel";
import { type CreateInvoiceInput, type CreateInvoiceOutput } from "@corely/contracts";
import { type InvoiceRepoPort } from "../../ports/invoice-repository.port";
import { InvoiceAggregate } from "../../../domain/invoice.aggregate";
import { toInvoiceDto } from "../shared/invoice-dto.mapper";
import { type CustomerQueryPort } from "../../ports/customer-query.port";

type Deps = {
  logger: LoggerPort;
  invoiceRepo: InvoiceRepoPort;
  idGenerator: IdGeneratorPort;
  clock: ClockPort;
  timeService: TimeService;
  customerQuery: CustomerQueryPort;
};

export class CreateInvoiceUseCase extends BaseUseCase<CreateInvoiceInput, CreateInvoiceOutput> {
  constructor(private readonly useCaseDeps: Deps) {
    super({ logger: useCaseDeps.logger });
  }

  protected validate(input: CreateInvoiceInput): CreateInvoiceInput {
    if (!input.customerPartyId) {
      throw new ValidationError("customerPartyId is required");
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

    const customer = await this.useCaseDeps.customerQuery.getCustomerBillingSnapshot(
      ctx.tenantId,
      input.customerPartyId
    );
    if (!customer) {
      return err(new NotFoundError("Customer not found"));
    }

    const createdAt = this.useCaseDeps.clock.now();
    const invoiceDate =
      input.invoiceDate !== undefined && input.invoiceDate !== null
        ? parseLocalDate(input.invoiceDate)
        : await this.useCaseDeps.timeService.todayInTenant(ctx.tenantId);
    const dueDate =
      input.dueDate !== undefined && input.dueDate !== null ? parseLocalDate(input.dueDate) : null;
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
      customerPartyId: input.customerPartyId,
      currency: input.currency,
      notes: input.notes,
      terms: input.terms,
      invoiceDate,
      dueDate,
      lineItems: lines,
      createdAt,
      billToSnapshot: {
        name: customer.displayName,
        email: customer.email ?? null,
        vatId: customer.vatId ?? null,
        address: customer.billingAddress
          ? {
              line1: customer.billingAddress.line1,
              line2: customer.billingAddress.line2 ?? null,
              city: customer.billingAddress.city ?? null,
              postalCode: customer.billingAddress.postalCode ?? null,
              country: customer.billingAddress.country ?? null,
            }
          : undefined,
      },
    });

    await this.useCaseDeps.invoiceRepo.create(ctx.tenantId, aggregate);

    return ok({ invoice: toInvoiceDto(aggregate) });
  }
}
