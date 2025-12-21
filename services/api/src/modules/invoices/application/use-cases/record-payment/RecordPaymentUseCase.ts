import {
  BaseUseCase,
  ConflictError,
  IdGeneratorPort,
  LoggerPort,
  NotFoundError,
  Result,
  UseCaseContext,
  UseCaseError,
  ValidationError,
  err,
  ok,
} from "@kerniflow/kernel";
import { RecordPaymentInput, RecordPaymentOutput } from "@kerniflow/contracts";
import { InvoiceRepoPort } from "../../ports/invoice-repo.port";
import { toInvoiceDto } from "../shared/invoice-dto.mapper";

type Deps = {
  logger: LoggerPort;
  invoiceRepo: InvoiceRepoPort;
  idGenerator: IdGeneratorPort;
};

export class RecordPaymentUseCase extends BaseUseCase<RecordPaymentInput, RecordPaymentOutput> {
  constructor(private readonly useCaseDeps: Deps) {
    super({ logger: useCaseDeps.logger });
  }

  protected validate(input: RecordPaymentInput): RecordPaymentInput {
    if (input.amountCents <= 0) {
      throw new ValidationError("amountCents must be positive");
    }
    return input;
  }

  protected async handle(
    input: RecordPaymentInput,
    ctx: UseCaseContext
  ): Promise<Result<RecordPaymentOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId is required"));
    }

    const invoice = await this.useCaseDeps.invoiceRepo.findById(ctx.tenantId, input.invoiceId);
    if (!invoice) {
      return err(new NotFoundError("Invoice not found"));
    }

    try {
      invoice.recordPayment({
        id: this.useCaseDeps.idGenerator.newId(),
        amountCents: input.amountCents,
        paidAt: input.paidAt ? new Date(input.paidAt) : new Date(),
        note: input.note,
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
