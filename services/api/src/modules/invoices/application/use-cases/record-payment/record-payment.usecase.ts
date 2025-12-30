import {
  BaseUseCase,
  type ClockPort,
  ConflictError,
  type IdGeneratorPort,
  type LoggerPort,
  NotFoundError,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ValidationError,
  err,
  ok,
} from "@corely/kernel";
import { type RecordPaymentInput, type RecordPaymentOutput } from "@corely/contracts";
import { type InvoiceRepoPort } from "../../ports/invoice-repository.port";
import { toInvoiceDto } from "../shared/invoice-dto.mapper";

type Deps = {
  logger: LoggerPort;
  invoiceRepo: InvoiceRepoPort;
  idGenerator: IdGeneratorPort;
  clock: ClockPort;
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
      const now = this.useCaseDeps.clock.now();
      invoice.recordPayment(
        {
          id: this.useCaseDeps.idGenerator.newId(),
          amountCents: input.amountCents,
          paidAt: input.paidAt ? new Date(input.paidAt) : now,
          note: input.note,
        },
        now
      );
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
