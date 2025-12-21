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
import { UpdateInvoiceInput, UpdateInvoiceOutput } from "@kerniflow/contracts";
import { InvoiceRepoPort } from "../../ports/invoice-repo.port";
import { toInvoiceDto } from "../shared/invoice-dto.mapper";

type Deps = {
  logger: LoggerPort;
  invoiceRepo: InvoiceRepoPort;
  idGenerator: IdGeneratorPort;
};

export class UpdateInvoiceUseCase extends BaseUseCase<UpdateInvoiceInput, UpdateInvoiceOutput> {
  constructor(private readonly useCaseDeps: Deps) {
    super({ logger: useCaseDeps.logger });
  }

  protected validate(input: UpdateInvoiceInput): UpdateInvoiceInput {
    if (!input.invoiceId) {
      throw new ValidationError("invoiceId is required");
    }
    if (
      (!input.headerPatch || Object.keys(input.headerPatch).length === 0) &&
      (!input.lineItems || input.lineItems.length === 0)
    ) {
      throw new ValidationError("Nothing to update");
    }
    return input;
  }

  protected async handle(
    input: UpdateInvoiceInput,
    ctx: UseCaseContext
  ): Promise<Result<UpdateInvoiceOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId is required"));
    }

    const invoice = await this.useCaseDeps.invoiceRepo.findById(ctx.tenantId, input.invoiceId);
    if (!invoice) {
      return err(new NotFoundError("Invoice not found"));
    }

    try {
      if (input.headerPatch) {
        invoice.updateHeader({
          customerId: input.headerPatch.customerId,
          currency: input.headerPatch.currency,
          notes: input.headerPatch.notes,
          terms: input.headerPatch.terms,
        });
      }

      if (input.lineItems) {
        const newLines = input.lineItems.map((line) => ({
          id: line.id ?? this.useCaseDeps.idGenerator.newId(),
          description: line.description,
          qty: line.qty,
          unitPriceCents: line.unitPriceCents,
        }));
        invoice.replaceLineItems(newLines);
      }
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
