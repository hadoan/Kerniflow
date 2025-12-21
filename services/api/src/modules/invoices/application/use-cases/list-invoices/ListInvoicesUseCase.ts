import {
  BaseUseCase,
  LoggerPort,
  Result,
  TimeService,
  UseCaseContext,
  UseCaseError,
  ValidationError,
  err,
  ok,
} from "@kerniflow/kernel";
import { ListInvoicesInput, ListInvoicesOutput } from "@kerniflow/contracts";
import { InvoiceRepoPort } from "../../ports/invoice-repo.port";
import { toInvoiceDto } from "../shared/invoice-dto.mapper";

type Deps = { logger: LoggerPort; invoiceRepo: InvoiceRepoPort; timeService: TimeService };

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
    const fromDate =
      input.fromDate !== undefined && input.fromDate !== null
        ? await this.useCaseDeps.timeService.localDateToTenantStartOfDayUtc(
            ctx.tenantId,
            input.fromDate
          )
        : undefined;
    const toDate =
      input.toDate !== undefined && input.toDate !== null
        ? await this.useCaseDeps.timeService.localDateToTenantEndOfDayUtc(
            ctx.tenantId,
            input.toDate
          )
        : undefined;
    const { items, nextCursor } = await this.useCaseDeps.invoiceRepo.list(
      ctx.tenantId,
      {
        status: input.status,
        customerPartyId: input.customerPartyId,
        fromDate,
        toDate,
      },
      pageSize,
      input.cursor
    );

    return ok({ items: items.map(toInvoiceDto), nextCursor: nextCursor ?? null });
  }
}
