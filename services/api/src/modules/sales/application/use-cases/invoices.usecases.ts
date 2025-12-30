import {
  BaseUseCase,
  type ClockPort,
  type IdGeneratorPort,
  type LoggerPort,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ValidationError,
  NotFoundError,
  type AuditPort,
  err,
  ok,
  parseLocalDate,
} from "@corely/kernel";
import type {
  CreateSalesInvoiceInput,
  CreateSalesInvoiceOutput,
  UpdateSalesInvoiceInput,
  UpdateSalesInvoiceOutput,
  IssueSalesInvoiceInput,
  IssueSalesInvoiceOutput,
  VoidSalesInvoiceInput,
  VoidSalesInvoiceOutput,
  GetSalesInvoiceInput,
  GetSalesInvoiceOutput,
  ListSalesInvoicesInput,
  ListSalesInvoicesOutput,
  CreateJournalEntryInput,
  PostJournalEntryInput,
} from "@corely/contracts";
import { SalesInvoiceAggregate } from "../../domain/invoice.aggregate";
import type { InvoiceLineItem } from "../../domain/sales.types";
import type { SalesInvoiceRepositoryPort } from "../ports/invoice-repository.port";
import type { SalesSettingsRepositoryPort } from "../ports/settings-repository.port";
import { SalesSettingsAggregate } from "../../domain/settings.aggregate";
import { toInvoiceDto } from "../mappers/sales-dto.mapper";
import { allocateUniqueNumber } from "./numbering";
import type { IdempotencyStoragePort } from "../../../../shared/ports/idempotency-storage.port";
import { getIdempotentResult, storeIdempotentResult } from "./idempotency";
import type { CustomerQueryPort } from "../../../party/application/ports/customer-query.port";
import type { AccountingApplication } from "../../../accounting/application/accounting.application";

const buildLineItems = (params: {
  idGenerator: IdGeneratorPort;
  lineItems: Array<{
    id?: string;
    description: string;
    quantity: number;
    unitPriceCents: number;
    discountCents?: number;
    taxCode?: string;
    revenueCategory?: string;
    sortOrder?: number;
  }>;
}): InvoiceLineItem[] =>
  params.lineItems.map((item, idx) => ({
    id: item.id ?? params.idGenerator.newId(),
    description: item.description,
    quantity: item.quantity,
    unitPriceCents: item.unitPriceCents,
    discountCents: item.discountCents,
    taxCode: item.taxCode,
    revenueCategory: item.revenueCategory,
    sortOrder: item.sortOrder ?? idx,
  }));

type InvoiceDeps = {
  logger: LoggerPort;
  invoiceRepo: SalesInvoiceRepositoryPort;
  settingsRepo: SalesSettingsRepositoryPort;
  idGenerator: IdGeneratorPort;
  clock: ClockPort;
  customerQuery: CustomerQueryPort;
  idempotency: IdempotencyStoragePort;
  accounting: AccountingApplication;
  audit: AuditPort;
};

export class CreateSalesInvoiceUseCase extends BaseUseCase<
  CreateSalesInvoiceInput,
  CreateSalesInvoiceOutput
> {
  constructor(private readonly services: InvoiceDeps) {
    super({ logger: services.logger });
  }

  protected validate(input: CreateSalesInvoiceInput): CreateSalesInvoiceInput {
    if (!input.customerPartyId) {
      throw new ValidationError("customerPartyId is required");
    }
    if (!input.currency) {
      throw new ValidationError("currency is required");
    }
    if (!input.lineItems?.length) {
      throw new ValidationError("At least one line item is required");
    }
    return input;
  }

  protected async handle(
    input: CreateSalesInvoiceInput,
    ctx: UseCaseContext
  ): Promise<Result<CreateSalesInvoiceOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId missing from context"));
    }

    const cached = await getIdempotentResult<CreateSalesInvoiceOutput>({
      idempotency: this.services.idempotency,
      actionKey: "sales.create-invoice",
      tenantId: ctx.tenantId,
      idempotencyKey: input.idempotencyKey,
    });
    if (cached) {
      return ok(cached);
    }

    const customer = await this.services.customerQuery.getCustomerBillingSnapshot(
      ctx.tenantId,
      input.customerPartyId
    );
    if (!customer) {
      return err(new NotFoundError("Customer not found"));
    }

    const now = this.services.clock.now();
    const issueDate = input.issueDate ? parseLocalDate(input.issueDate) : null;
    const dueDate = input.dueDate ? parseLocalDate(input.dueDate) : null;
    const lineItems = buildLineItems({
      idGenerator: this.services.idGenerator,
      lineItems: input.lineItems,
    });

    const invoice = SalesInvoiceAggregate.createDraft({
      id: this.services.idGenerator.newId(),
      tenantId: ctx.tenantId,
      customerPartyId: input.customerPartyId,
      customerContactPartyId: input.customerContactPartyId ?? null,
      issueDate,
      dueDate,
      currency: input.currency,
      paymentTerms: input.paymentTerms,
      notes: input.notes,
      lineItems,
      sourceSalesOrderId: input.sourceSalesOrderId ?? null,
      sourceQuoteId: input.sourceQuoteId ?? null,
      now,
    });

    await this.services.invoiceRepo.create(ctx.tenantId, invoice);

    const result = { invoice: toInvoiceDto(invoice) };
    await storeIdempotentResult({
      idempotency: this.services.idempotency,
      actionKey: "sales.create-invoice",
      tenantId: ctx.tenantId,
      idempotencyKey: input.idempotencyKey,
      body: result,
    });

    return ok(result);
  }
}

export class UpdateSalesInvoiceUseCase extends BaseUseCase<
  UpdateSalesInvoiceInput,
  UpdateSalesInvoiceOutput
> {
  constructor(private readonly services: InvoiceDeps) {
    super({ logger: services.logger });
  }

  protected async handle(
    input: UpdateSalesInvoiceInput,
    ctx: UseCaseContext
  ): Promise<Result<UpdateSalesInvoiceOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId missing from context"));
    }

    const invoice = await this.services.invoiceRepo.findById(ctx.tenantId, input.invoiceId);
    if (!invoice) {
      return err(new NotFoundError("Sales invoice not found"));
    }

    const now = this.services.clock.now();
    if (input.headerPatch) {
      invoice.updateHeader(
        {
          customerPartyId: input.headerPatch.customerPartyId,
          customerContactPartyId: input.headerPatch.customerContactPartyId,
          issueDate: input.headerPatch.issueDate
            ? parseLocalDate(input.headerPatch.issueDate)
            : undefined,
          dueDate: input.headerPatch.dueDate
            ? parseLocalDate(input.headerPatch.dueDate)
            : undefined,
          currency: input.headerPatch.currency,
          paymentTerms: input.headerPatch.paymentTerms,
          notes: input.headerPatch.notes,
        },
        now
      );
    }

    if (input.lineItems) {
      const lineItems = buildLineItems({
        idGenerator: this.services.idGenerator,
        lineItems: input.lineItems,
      });
      invoice.replaceLineItems(lineItems, now);
    }

    await this.services.invoiceRepo.save(ctx.tenantId, invoice);
    return ok({ invoice: toInvoiceDto(invoice) });
  }
}

const buildRevenueLines = (params: {
  lineItems: InvoiceLineItem[];
  currency: string;
  defaultRevenueAccountId: string;
}): Array<{
  ledgerAccountId: string;
  amountCents: number;
  currency: string;
  lineMemo?: string;
}> => {
  const buckets = new Map<string, number>();
  for (const line of params.lineItems) {
    const accountId = line.revenueCategory ?? params.defaultRevenueAccountId;
    const amount = line.quantity * line.unitPriceCents - (line.discountCents ?? 0);
    const current = buckets.get(accountId) ?? 0;
    buckets.set(accountId, current + amount);
  }
  return Array.from(buckets.entries()).map(([ledgerAccountId, amountCents]) => ({
    ledgerAccountId,
    amountCents,
    currency: params.currency,
    lineMemo: "Revenue",
  }));
};

export class IssueSalesInvoiceUseCase extends BaseUseCase<
  IssueSalesInvoiceInput,
  IssueSalesInvoiceOutput
> {
  constructor(private readonly services: InvoiceDeps) {
    super({ logger: services.logger });
  }

  protected async handle(
    input: IssueSalesInvoiceInput,
    ctx: UseCaseContext
  ): Promise<Result<IssueSalesInvoiceOutput, UseCaseError>> {
    if (!ctx.tenantId || !ctx.userId) {
      return err(new ValidationError("tenantId and userId are required"));
    }

    const cached = await getIdempotentResult<IssueSalesInvoiceOutput>({
      idempotency: this.services.idempotency,
      actionKey: "sales.issue-invoice",
      tenantId: ctx.tenantId,
      idempotencyKey: input.idempotencyKey,
    });
    if (cached) {
      return ok(cached);
    }

    const invoice = await this.services.invoiceRepo.findById(ctx.tenantId, input.invoiceId);
    if (!invoice) {
      return err(new NotFoundError("Sales invoice not found"));
    }

    const now = this.services.clock.now();
    let settings = await this.services.settingsRepo.findByTenant(ctx.tenantId);
    if (!settings) {
      settings = SalesSettingsAggregate.createDefault({
        id: this.services.idGenerator.newId(),
        tenantId: ctx.tenantId,
        now,
      });
    }

    const number = await allocateUniqueNumber({
      next: () => settings!.allocateInvoiceNumber(),
      isTaken: (candidate) =>
        this.services.invoiceRepo.isInvoiceNumberTaken(ctx.tenantId!, candidate),
    });

    invoice.issue(number, now, now);

    if (settings.autoPostOnIssue) {
      if (!settings.defaultAccountsReceivableAccountId) {
        return err(new ValidationError("Default AR account is required for posting"));
      }
      if (!settings.defaultRevenueAccountId) {
        return err(new ValidationError("Default revenue account is required for posting"));
      }

      const revenueLines = buildRevenueLines({
        lineItems: invoice.lineItems,
        currency: invoice.currency,
        defaultRevenueAccountId: settings.defaultRevenueAccountId,
      });

      const createInput: CreateJournalEntryInput = {
        postingDate: invoice.issueDate ?? (new Date().toISOString().slice(0, 10) as any),
        memo: `Invoice ${invoice.number ?? invoice.id} issued`,
        lines: [
          {
            ledgerAccountId: settings.defaultAccountsReceivableAccountId,
            direction: "Debit" as const,
            amountCents: invoice.totals.totalCents,
            currency: invoice.currency,
          },
          ...revenueLines.map((line) => ({
            ledgerAccountId: line.ledgerAccountId,
            direction: "Credit" as const,
            amountCents: line.amountCents,
            currency: line.currency,
            lineMemo: line.lineMemo,
          })),
        ],
        sourceType: "Invoice",
        sourceId: invoice.id,
        sourceRef: invoice.number ?? undefined,
      };

      const created = await this.services.accounting.createJournalEntry.execute(createInput, ctx);
      if ("error" in created) {
        return err(created.error);
      }

      const postInput: PostJournalEntryInput = {
        entryId: created.value.entry.id,
      };
      const posted = await this.services.accounting.postJournalEntry.execute(postInput, ctx);
      if ("error" in posted) {
        return err(posted.error);
      }

      invoice.setIssuedJournalEntry(created.value.entry.id, now);
    }

    await this.services.invoiceRepo.save(ctx.tenantId, invoice);
    await this.services.settingsRepo.save(settings);
    await this.services.audit.log({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      action: "sales.invoice.issued",
      entityType: "SalesInvoice",
      entityId: invoice.id,
      metadata: { number: invoice.number, journalEntryId: invoice.issuedJournalEntryId ?? null },
    });

    const result = { invoice: toInvoiceDto(invoice) };
    await storeIdempotentResult({
      idempotency: this.services.idempotency,
      actionKey: "sales.issue-invoice",
      tenantId: ctx.tenantId,
      idempotencyKey: input.idempotencyKey,
      body: result,
    });

    return ok(result);
  }
}

export class VoidSalesInvoiceUseCase extends BaseUseCase<
  VoidSalesInvoiceInput,
  VoidSalesInvoiceOutput
> {
  constructor(private readonly services: InvoiceDeps) {
    super({ logger: services.logger });
  }

  protected async handle(
    input: VoidSalesInvoiceInput,
    ctx: UseCaseContext
  ): Promise<Result<VoidSalesInvoiceOutput, UseCaseError>> {
    if (!ctx.tenantId || !ctx.userId) {
      return err(new ValidationError("tenantId and userId are required"));
    }

    const cached = await getIdempotentResult<VoidSalesInvoiceOutput>({
      idempotency: this.services.idempotency,
      actionKey: "sales.void-invoice",
      tenantId: ctx.tenantId,
      idempotencyKey: input.idempotencyKey,
    });
    if (cached) {
      return ok(cached);
    }

    const invoice = await this.services.invoiceRepo.findById(ctx.tenantId, input.invoiceId);
    if (!invoice) {
      return err(new NotFoundError("Sales invoice not found"));
    }

    const now = this.services.clock.now();
    invoice.void(input.reason, now, now);
    await this.services.invoiceRepo.save(ctx.tenantId, invoice);
    await this.services.audit.log({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      action: "sales.invoice.voided",
      entityType: "SalesInvoice",
      entityId: invoice.id,
      metadata: { reason: input.reason ?? null },
    });

    const result = { invoice: toInvoiceDto(invoice) };
    await storeIdempotentResult({
      idempotency: this.services.idempotency,
      actionKey: "sales.void-invoice",
      tenantId: ctx.tenantId,
      idempotencyKey: input.idempotencyKey,
      body: result,
    });

    return ok(result);
  }
}

export class GetSalesInvoiceUseCase extends BaseUseCase<
  GetSalesInvoiceInput,
  GetSalesInvoiceOutput
> {
  constructor(private readonly services: InvoiceDeps) {
    super({ logger: services.logger });
  }

  protected async handle(
    input: GetSalesInvoiceInput,
    ctx: UseCaseContext
  ): Promise<Result<GetSalesInvoiceOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId missing from context"));
    }

    const invoice = await this.services.invoiceRepo.findById(ctx.tenantId, input.invoiceId);
    if (!invoice) {
      return err(new NotFoundError("Sales invoice not found"));
    }
    return ok({ invoice: toInvoiceDto(invoice) });
  }
}

export class ListSalesInvoicesUseCase extends BaseUseCase<
  ListSalesInvoicesInput,
  ListSalesInvoicesOutput
> {
  constructor(private readonly services: InvoiceDeps) {
    super({ logger: services.logger });
  }

  protected async handle(
    input: ListSalesInvoicesInput,
    ctx: UseCaseContext
  ): Promise<Result<ListSalesInvoicesOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId missing from context"));
    }

    const result = await this.services.invoiceRepo.list(
      ctx.tenantId,
      {
        status: input.status as any,
        customerPartyId: input.customerPartyId,
        fromDate: input.fromDate ? new Date(`${input.fromDate}T00:00:00.000Z`) : undefined,
        toDate: input.toDate ? new Date(`${input.toDate}T23:59:59.999Z`) : undefined,
      },
      input.pageSize,
      input.cursor
    );

    return ok({
      items: result.items.map(toInvoiceDto),
      nextCursor: result.nextCursor ?? null,
    });
  }
}
