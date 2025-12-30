import {
  BaseUseCase,
  type ClockPort,
  ConflictError,
  type LoggerPort,
  NotFoundError,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ValidationError,
  err,
  ok,
} from "@corely/kernel";
import { type FinalizeInvoiceInput, type FinalizeInvoiceOutput } from "@corely/contracts";
import { type InvoiceRepoPort } from "../../ports/invoice-repository.port";
import { type InvoiceNumberingPort } from "../../ports/invoice-numbering.port";
import { toInvoiceDto } from "../shared/invoice-dto.mapper";
import { type CustomerQueryPort } from "../../ports/customer-query.port";

type Deps = {
  logger: LoggerPort;
  invoiceRepo: InvoiceRepoPort;
  numbering: InvoiceNumberingPort;
  clock: ClockPort;
  customerQuery: CustomerQueryPort;
};

export class FinalizeInvoiceUseCase extends BaseUseCase<
  FinalizeInvoiceInput,
  FinalizeInvoiceOutput
> {
  constructor(private readonly useCaseDeps: Deps) {
    super({ logger: useCaseDeps.logger });
  }

  protected async handle(
    input: FinalizeInvoiceInput,
    ctx: UseCaseContext
  ): Promise<Result<FinalizeInvoiceOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId is required"));
    }

    const invoice = await this.useCaseDeps.invoiceRepo.findById(ctx.tenantId, input.invoiceId);
    if (!invoice) {
      return err(new NotFoundError("Invoice not found"));
    }

    const customer = await this.useCaseDeps.customerQuery.getCustomerBillingSnapshot(
      ctx.tenantId,
      invoice.customerPartyId
    );
    if (!customer) {
      return err(new NotFoundError("Customer not found"));
    }

    try {
      const now = this.useCaseDeps.clock.now();
      const number = await this.useCaseDeps.numbering.nextInvoiceNumber(ctx.tenantId);
      invoice.finalize(number, now, now, {
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
      });
    } catch (error) {
      if (error instanceof ValidationError || error instanceof ConflictError) {
        return err(error);
      }
      return err(new ConflictError((error as Error).message));
    }

    await this.useCaseDeps.invoiceRepo.save(ctx.tenantId, invoice);
    return ok({ invoice: toInvoiceDto(invoice) });
  }
}
