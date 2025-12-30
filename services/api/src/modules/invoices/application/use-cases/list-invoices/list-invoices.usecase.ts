import {
  BaseUseCase,
  type LoggerPort,
  type Result,
  type TimeService,
  type UseCaseContext,
  type UseCaseError,
  ValidationError,
  err,
  ok,
  parseLocalDate,
} from "@corely/kernel";
import { type ListInvoicesInput, type ListInvoicesOutput } from "@corely/contracts";
import { type InvoiceRepoPort } from "../../ports/invoice-repository.port";
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
            parseLocalDate(input.fromDate)
          )
        : undefined;
    const toDate =
      input.toDate !== undefined && input.toDate !== null
        ? await this.useCaseDeps.timeService.localDateToTenantEndOfDayUtc(
            ctx.tenantId,
            parseLocalDate(input.toDate)
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
