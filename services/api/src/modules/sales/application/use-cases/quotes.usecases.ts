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
  CreateQuoteInput,
  CreateQuoteOutput,
  UpdateQuoteInput,
  UpdateQuoteOutput,
  SendQuoteInput,
  SendQuoteOutput,
  AcceptQuoteInput,
  AcceptQuoteOutput,
  RejectQuoteInput,
  RejectQuoteOutput,
  ConvertQuoteToOrderInput,
  ConvertQuoteToOrderOutput,
  ConvertQuoteToInvoiceInput,
  ConvertQuoteToInvoiceOutput,
  GetQuoteInput,
  GetQuoteOutput,
  ListQuotesInput,
  ListQuotesOutput,
} from "@corely/contracts";
import { QuoteAggregate } from "../../domain/quote.aggregate";
import { SalesOrderAggregate } from "../../domain/order.aggregate";
import { SalesInvoiceAggregate } from "../../domain/invoice.aggregate";
import type { QuoteLineItem } from "../../domain/sales.types";
import type { QuoteRepositoryPort } from "../ports/quote-repository.port";
import type { SalesSettingsRepositoryPort } from "../ports/settings-repository.port";
import { SalesSettingsAggregate } from "../../domain/settings.aggregate";
import { toQuoteDto, toOrderDto, toInvoiceDto } from "../mappers/sales-dto.mapper";
import { allocateUniqueNumber } from "./numbering";
import type { IdempotencyStoragePort } from "../../../../shared/ports/idempotency-storage.port";
import { getIdempotentResult, storeIdempotentResult } from "./idempotency";
import type { CustomerQueryPort } from "../../../party/application/ports/customer-query.port";
import type { SalesOrderRepositoryPort } from "../ports/order-repository.port";
import type { SalesInvoiceRepositoryPort } from "../ports/invoice-repository.port";

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
}): QuoteLineItem[] =>
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

type QuoteDeps = {
  logger: LoggerPort;
  quoteRepo: QuoteRepositoryPort;
  settingsRepo: SalesSettingsRepositoryPort;
  orderRepo: SalesOrderRepositoryPort;
  invoiceRepo: SalesInvoiceRepositoryPort;
  idGenerator: IdGeneratorPort;
  clock: ClockPort;
  customerQuery: CustomerQueryPort;
  idempotency: IdempotencyStoragePort;
  audit: AuditPort;
};

export class CreateQuoteUseCase extends BaseUseCase<CreateQuoteInput, CreateQuoteOutput> {
  constructor(private readonly services: QuoteDeps) {
    super({ logger: services.logger });
  }

  protected validate(input: CreateQuoteInput): CreateQuoteInput {
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
    input: CreateQuoteInput,
    ctx: UseCaseContext
  ): Promise<Result<CreateQuoteOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId missing from context"));
    }

    const cached = await getIdempotentResult<CreateQuoteOutput>({
      idempotency: this.services.idempotency,
      actionKey: "sales.create-quote",
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
    const validUntilDate = input.validUntilDate ? parseLocalDate(input.validUntilDate) : null;
    const lineItems = buildLineItems({
      idGenerator: this.services.idGenerator,
      lineItems: input.lineItems,
    });

    const quote = QuoteAggregate.createDraft({
      id: this.services.idGenerator.newId(),
      tenantId: ctx.tenantId,
      customerPartyId: input.customerPartyId,
      customerContactPartyId: input.customerContactPartyId ?? null,
      issueDate,
      validUntilDate,
      currency: input.currency,
      paymentTerms: input.paymentTerms,
      notes: input.notes,
      lineItems,
      now,
    });

    await this.services.quoteRepo.create(ctx.tenantId, quote);

    const result = { quote: toQuoteDto(quote) };
    await storeIdempotentResult({
      idempotency: this.services.idempotency,
      actionKey: "sales.create-quote",
      tenantId: ctx.tenantId,
      idempotencyKey: input.idempotencyKey,
      body: result,
    });

    return ok(result);
  }
}

export class UpdateQuoteUseCase extends BaseUseCase<UpdateQuoteInput, UpdateQuoteOutput> {
  constructor(private readonly services: QuoteDeps) {
    super({ logger: services.logger });
  }

  protected async handle(
    input: UpdateQuoteInput,
    ctx: UseCaseContext
  ): Promise<Result<UpdateQuoteOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId missing from context"));
    }

    const quote = await this.services.quoteRepo.findById(ctx.tenantId, input.quoteId);
    if (!quote) {
      return err(new NotFoundError("Quote not found"));
    }

    const now = this.services.clock.now();
    if (input.headerPatch) {
      quote.updateHeader(
        {
          customerPartyId: input.headerPatch.customerPartyId,
          customerContactPartyId: input.headerPatch.customerContactPartyId,
          issueDate: input.headerPatch.issueDate
            ? parseLocalDate(input.headerPatch.issueDate)
            : undefined,
          validUntilDate: input.headerPatch.validUntilDate
            ? parseLocalDate(input.headerPatch.validUntilDate)
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
      quote.replaceLineItems(lineItems, now);
    }

    await this.services.quoteRepo.save(ctx.tenantId, quote);
    return ok({ quote: toQuoteDto(quote) });
  }
}

export class SendQuoteUseCase extends BaseUseCase<SendQuoteInput, SendQuoteOutput> {
  constructor(private readonly services: QuoteDeps) {
    super({ logger: services.logger });
  }

  protected async handle(
    input: SendQuoteInput,
    ctx: UseCaseContext
  ): Promise<Result<SendQuoteOutput, UseCaseError>> {
    if (!ctx.tenantId || !ctx.userId) {
      return err(new ValidationError("tenantId and userId are required"));
    }

    const cached = await getIdempotentResult<SendQuoteOutput>({
      idempotency: this.services.idempotency,
      actionKey: "sales.send-quote",
      tenantId: ctx.tenantId,
      idempotencyKey: input.idempotencyKey,
    });
    if (cached) {
      return ok(cached);
    }

    const quote = await this.services.quoteRepo.findById(ctx.tenantId, input.quoteId);
    if (!quote) {
      return err(new NotFoundError("Quote not found"));
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
      next: () => settings!.allocateQuoteNumber(),
      isTaken: (candidate) => this.services.quoteRepo.isQuoteNumberTaken(ctx.tenantId!, candidate),
    });
    quote.send(number, now, now);

    await this.services.quoteRepo.save(ctx.tenantId, quote);
    await this.services.settingsRepo.save(settings);
    await this.services.audit.log({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      action: "sales.quote.sent",
      entityType: "SalesQuote",
      entityId: quote.id,
      metadata: { number: quote.number },
    });

    const result = { quote: toQuoteDto(quote) };
    await storeIdempotentResult({
      idempotency: this.services.idempotency,
      actionKey: "sales.send-quote",
      tenantId: ctx.tenantId,
      idempotencyKey: input.idempotencyKey,
      body: result,
    });

    return ok(result);
  }
}

export class AcceptQuoteUseCase extends BaseUseCase<AcceptQuoteInput, AcceptQuoteOutput> {
  constructor(private readonly services: QuoteDeps) {
    super({ logger: services.logger });
  }

  protected async handle(
    input: AcceptQuoteInput,
    ctx: UseCaseContext
  ): Promise<Result<AcceptQuoteOutput, UseCaseError>> {
    if (!ctx.tenantId || !ctx.userId) {
      return err(new ValidationError("tenantId and userId are required"));
    }

    const cached = await getIdempotentResult<AcceptQuoteOutput>({
      idempotency: this.services.idempotency,
      actionKey: "sales.accept-quote",
      tenantId: ctx.tenantId,
      idempotencyKey: input.idempotencyKey,
    });
    if (cached) {
      return ok(cached);
    }

    const quote = await this.services.quoteRepo.findById(ctx.tenantId, input.quoteId);
    if (!quote) {
      return err(new NotFoundError("Quote not found"));
    }

    const now = this.services.clock.now();
    quote.accept(now, now);
    await this.services.quoteRepo.save(ctx.tenantId, quote);
    await this.services.audit.log({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      action: "sales.quote.accepted",
      entityType: "SalesQuote",
      entityId: quote.id,
      metadata: { number: quote.number },
    });

    const result = { quote: toQuoteDto(quote) };
    await storeIdempotentResult({
      idempotency: this.services.idempotency,
      actionKey: "sales.accept-quote",
      tenantId: ctx.tenantId,
      idempotencyKey: input.idempotencyKey,
      body: result,
    });

    return ok(result);
  }
}

export class RejectQuoteUseCase extends BaseUseCase<RejectQuoteInput, RejectQuoteOutput> {
  constructor(private readonly services: QuoteDeps) {
    super({ logger: services.logger });
  }

  protected async handle(
    input: RejectQuoteInput,
    ctx: UseCaseContext
  ): Promise<Result<RejectQuoteOutput, UseCaseError>> {
    if (!ctx.tenantId || !ctx.userId) {
      return err(new ValidationError("tenantId and userId are required"));
    }

    const cached = await getIdempotentResult<RejectQuoteOutput>({
      idempotency: this.services.idempotency,
      actionKey: "sales.reject-quote",
      tenantId: ctx.tenantId,
      idempotencyKey: input.idempotencyKey,
    });
    if (cached) {
      return ok(cached);
    }

    const quote = await this.services.quoteRepo.findById(ctx.tenantId, input.quoteId);
    if (!quote) {
      return err(new NotFoundError("Quote not found"));
    }

    const now = this.services.clock.now();
    quote.reject(now, now);
    await this.services.quoteRepo.save(ctx.tenantId, quote);
    await this.services.audit.log({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      action: "sales.quote.rejected",
      entityType: "SalesQuote",
      entityId: quote.id,
      metadata: { number: quote.number },
    });

    const result = { quote: toQuoteDto(quote) };
    await storeIdempotentResult({
      idempotency: this.services.idempotency,
      actionKey: "sales.reject-quote",
      tenantId: ctx.tenantId,
      idempotencyKey: input.idempotencyKey,
      body: result,
    });

    return ok(result);
  }
}

export class ConvertQuoteToOrderUseCase extends BaseUseCase<
  ConvertQuoteToOrderInput,
  ConvertQuoteToOrderOutput
> {
  constructor(private readonly services: QuoteDeps) {
    super({ logger: services.logger });
  }

  protected async handle(
    input: ConvertQuoteToOrderInput,
    ctx: UseCaseContext
  ): Promise<Result<ConvertQuoteToOrderOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId missing from context"));
    }

    const cached = await getIdempotentResult<ConvertQuoteToOrderOutput>({
      idempotency: this.services.idempotency,
      actionKey: "sales.convert-quote-to-order",
      tenantId: ctx.tenantId,
      idempotencyKey: input.idempotencyKey,
    });
    if (cached) {
      return ok(cached);
    }

    const quote = await this.services.quoteRepo.findById(ctx.tenantId, input.quoteId);
    if (!quote) {
      return err(new NotFoundError("Quote not found"));
    }

    const now = this.services.clock.now();
    const order = SalesOrderAggregate.createDraft({
      id: this.services.idGenerator.newId(),
      tenantId: ctx.tenantId,
      customerPartyId: quote.customerPartyId,
      customerContactPartyId: quote.customerContactPartyId,
      orderDate: quote.issueDate,
      deliveryDate: null,
      currency: quote.currency,
      notes: quote.notes,
      lineItems: quote.lineItems.map((line) => ({ ...line })),
      sourceQuoteId: quote.id,
      now,
    });

    await this.services.orderRepo.create(ctx.tenantId, order);
    quote.markConverted({ orderId: order.id }, now);
    await this.services.quoteRepo.save(ctx.tenantId, quote);
    await this.services.audit.log({
      tenantId: ctx.tenantId,
      userId: ctx.userId ?? "system",
      action: "sales.quote.converted_to_order",
      entityType: "SalesQuote",
      entityId: quote.id,
      metadata: { orderId: order.id },
    });

    const payload = { order: toOrderDto(order) };

    await storeIdempotentResult({
      idempotency: this.services.idempotency,
      actionKey: "sales.convert-quote-to-order",
      tenantId: ctx.tenantId,
      idempotencyKey: input.idempotencyKey,
      body: payload,
    });

    return ok(payload);
  }
}

export class ConvertQuoteToInvoiceUseCase extends BaseUseCase<
  ConvertQuoteToInvoiceInput,
  ConvertQuoteToInvoiceOutput
> {
  constructor(private readonly services: QuoteDeps) {
    super({ logger: services.logger });
  }

  protected async handle(
    input: ConvertQuoteToInvoiceInput,
    ctx: UseCaseContext
  ): Promise<Result<ConvertQuoteToInvoiceOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId missing from context"));
    }

    const cached = await getIdempotentResult<ConvertQuoteToInvoiceOutput>({
      idempotency: this.services.idempotency,
      actionKey: "sales.convert-quote-to-invoice",
      tenantId: ctx.tenantId,
      idempotencyKey: input.idempotencyKey,
    });
    if (cached) {
      return ok(cached);
    }

    const quote = await this.services.quoteRepo.findById(ctx.tenantId, input.quoteId);
    if (!quote) {
      return err(new NotFoundError("Quote not found"));
    }

    const now = this.services.clock.now();
    const invoice = SalesInvoiceAggregate.createDraft({
      id: this.services.idGenerator.newId(),
      tenantId: ctx.tenantId,
      customerPartyId: quote.customerPartyId,
      customerContactPartyId: quote.customerContactPartyId,
      issueDate: quote.issueDate,
      dueDate: null,
      currency: quote.currency,
      paymentTerms: quote.paymentTerms,
      notes: quote.notes,
      lineItems: quote.lineItems.map((line) => ({ ...line })),
      sourceSalesOrderId: null,
      sourceQuoteId: quote.id,
      now,
    });

    await this.services.invoiceRepo.create(ctx.tenantId, invoice);
    quote.markConverted({ invoiceId: invoice.id }, now);
    await this.services.quoteRepo.save(ctx.tenantId, quote);
    await this.services.audit.log({
      tenantId: ctx.tenantId,
      userId: ctx.userId ?? "system",
      action: "sales.quote.converted_to_invoice",
      entityType: "SalesQuote",
      entityId: quote.id,
      metadata: { invoiceId: invoice.id },
    });

    const payload = { invoice: toInvoiceDto(invoice) };

    await storeIdempotentResult({
      idempotency: this.services.idempotency,
      actionKey: "sales.convert-quote-to-invoice",
      tenantId: ctx.tenantId,
      idempotencyKey: input.idempotencyKey,
      body: payload,
    });

    return ok(payload);
  }
}

export class GetQuoteUseCase extends BaseUseCase<GetQuoteInput, GetQuoteOutput> {
  constructor(private readonly services: QuoteDeps) {
    super({ logger: services.logger });
  }

  protected async handle(
    input: GetQuoteInput,
    ctx: UseCaseContext
  ): Promise<Result<GetQuoteOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId missing from context"));
    }

    const quote = await this.services.quoteRepo.findById(ctx.tenantId, input.quoteId);
    if (!quote) {
      return err(new NotFoundError("Quote not found"));
    }
    return ok({ quote: toQuoteDto(quote) });
  }
}

export class ListQuotesUseCase extends BaseUseCase<ListQuotesInput, ListQuotesOutput> {
  constructor(private readonly services: QuoteDeps) {
    super({ logger: services.logger });
  }

  protected async handle(
    input: ListQuotesInput,
    ctx: UseCaseContext
  ): Promise<Result<ListQuotesOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId missing from context"));
    }

    const result = await this.services.quoteRepo.list(
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
      items: result.items.map(toQuoteDto),
      nextCursor: result.nextCursor ?? null,
    });
  }
}
