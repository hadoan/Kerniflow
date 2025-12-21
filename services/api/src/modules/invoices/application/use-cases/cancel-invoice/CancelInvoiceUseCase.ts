import {
  BaseUseCase,
  ClockPort,
  ConflictError,
  LoggerPort,
  NotFoundError,
  Result,
  UseCaseContext,
  UseCaseError,
  ValidationError,
  err,
  ok,
} from "@kerniflow/kernel";
import { CancelInvoiceInput, CancelInvoiceOutput } from "@kerniflow/contracts";
import { InvoiceRepoPort } from "../../ports/invoice-repo.port";
import { toInvoiceDto } from "../shared/invoice-dto.mapper";

type Deps = {
  logger: LoggerPort;
  invoiceRepo: InvoiceRepoPort;
  clock: ClockPort;
};

export class CancelInvoiceUseCase extends BaseUseCase<CancelInvoiceInput, CancelInvoiceOutput> {
  constructor(private readonly useCaseDeps: Deps) {
    super({ logger: useCaseDeps.logger });
  }

  protected async handle(
    input: CancelInvoiceInput,
    ctx: UseCaseContext
  ): Promise<Result<CancelInvoiceOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId is required"));
    }

    const invoice = await this.useCaseDeps.invoiceRepo.findById(ctx.tenantId, input.invoiceId);
    if (!invoice) {
      return err(new NotFoundError("Invoice not found"));
    }

    try {
      const now = this.useCaseDeps.clock.now();
      invoice.cancel(input.reason, now, now);
    } catch (error) {
      return err(new ConflictError((error as Error).message));
    }

    await this.useCaseDeps.invoiceRepo.save(ctx.tenantId, invoice);
    return ok({ invoice: toInvoiceDto(invoice) });
  }
}
