import {
  BaseUseCase,
  type LoggerPort,
  NotFoundError,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ValidationError,
  err,
  ok,
} from "@corely/kernel";
import { type InvoiceRepoPort } from "../../ports/invoice-repository.port";
import { type GetInvoiceByIdCommand, type GetInvoiceByIdResult } from "./types";
import { toInvoiceDto } from "../shared/invoice-dto.mapper";

type Deps = {
  logger: LoggerPort;
  invoiceRepo: InvoiceRepoPort;
};

export class GetInvoiceByIdUseCase extends BaseUseCase<
  GetInvoiceByIdCommand,
  GetInvoiceByIdResult
> {
  constructor(private readonly useCaseDeps: Deps) {
    super({ logger: useCaseDeps.logger });
  }

  protected validate(input: GetInvoiceByIdCommand): GetInvoiceByIdCommand {
    if (!input.invoiceId) {
      throw new ValidationError("invoiceId is required");
    }

    return input;
  }

  protected async handle(
    input: GetInvoiceByIdCommand,
    ctx: UseCaseContext
  ): Promise<Result<GetInvoiceByIdResult, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId is required"));
    }

    const invoice = await this.useCaseDeps.invoiceRepo.findById(ctx.tenantId, input.invoiceId);
    if (!invoice) {
      return err(
        new NotFoundError("Invoice not found", { invoiceId: input.invoiceId }, "INVOICE_NOT_FOUND")
      );
    }

    return ok({ invoice: toInvoiceDto(invoice) });
  }
}
