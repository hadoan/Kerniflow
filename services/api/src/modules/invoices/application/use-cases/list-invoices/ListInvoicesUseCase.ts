import {
  BaseUseCase,
  LoggerPort,
  Result,
  UseCaseContext,
  UseCaseError,
  ValidationError,
  err,
  ok,
} from "@kerniflow/kernel";
import { ListInvoicesInput, ListInvoicesOutput } from "@kerniflow/contracts";
import { InvoiceRepoPort } from "../../ports/invoice-repo.port";
import { toInvoiceDto } from "../shared/invoice-dto.mapper";

type Deps = { logger: LoggerPort; invoiceRepo: InvoiceRepoPort };

export class ListInvoicesUseCase extends BaseUseCase<ListInvoicesInput, ListInvoicesOutput> {
  constructor(private readonly useCaseDeps: Deps) {
    super({ logger: useCaseDeps.logger });
  }

  protected async handle(
    input: ListInvoicesInput,
    ctx: UseCaseContext
  ): Promise<Result<ListInvoicesOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId is required"));
    }

    const pageSize = input.pageSize ?? 20;
    const { items, nextCursor } = await this.useCaseDeps.invoiceRepo.list(
      ctx.tenantId,
      {
        status: input.status,
        customerId: input.customerId,
        fromDate: input.fromDate ? new Date(input.fromDate) : undefined,
        toDate: input.toDate ? new Date(input.toDate) : undefined,
      },
      pageSize,
      input.cursor
    );

    return ok({ items: items.map(toInvoiceDto), nextCursor: nextCursor ?? null });
  }
}
