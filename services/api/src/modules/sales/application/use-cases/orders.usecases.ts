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
  err,
  ok,
  parseLocalDate,
} from "@kerniflow/kernel";
import type {
  CreateSalesOrderInput,
  CreateSalesOrderOutput,
  UpdateSalesOrderInput,
  UpdateSalesOrderOutput,
  ConfirmSalesOrderInput,
  ConfirmSalesOrderOutput,
  FulfillSalesOrderInput,
  FulfillSalesOrderOutput,
  CancelSalesOrderInput,
  CancelSalesOrderOutput,
  CreateInvoiceFromOrderInput,
  CreateInvoiceFromOrderOutput,
  GetSalesOrderInput,
  GetSalesOrderOutput,
  ListSalesOrdersInput,
  ListSalesOrdersOutput,
} from "@kerniflow/contracts";
import { SalesOrderAggregate } from "../../domain/order.aggregate";
import { SalesInvoiceAggregate } from "../../domain/invoice.aggregate";
import type { OrderLineItem } from "../../domain/sales.types";
import type { SalesOrderRepositoryPort } from "../ports/order-repository.port";
import type { SalesInvoiceRepositoryPort } from "../ports/invoice-repository.port";
import type { SalesSettingsRepositoryPort } from "../ports/settings-repository.port";
import { SalesSettingsAggregate } from "../../domain/settings.aggregate";
import { toOrderDto, toInvoiceDto } from "../mappers/sales-dto.mapper";
import { allocateUniqueNumber } from "./numbering";
import type { IdempotencyStoragePort } from "../../../shared/ports/idempotency-storage.port";
import { getIdempotentResult, storeIdempotentResult } from "./idempotency";
import type { CustomerQueryPort } from "../../party-crm/application/ports/customer-query.port";

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
}): OrderLineItem[] =>
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

type OrderDeps = {
  logger: LoggerPort;
  orderRepo: SalesOrderRepositoryPort;
  invoiceRepo: SalesInvoiceRepositoryPort;
  settingsRepo: SalesSettingsRepositoryPort;
  idGenerator: IdGeneratorPort;
  clock: ClockPort;
  customerQuery: CustomerQueryPort;
  idempotency: IdempotencyStoragePort;
};

export class CreateSalesOrderUseCase extends BaseUseCase<
  CreateSalesOrderInput,
  CreateSalesOrderOutput
> {
  constructor(private readonly deps: OrderDeps) {
    super({ logger: deps.logger });
  }

  protected validate(input: CreateSalesOrderInput): CreateSalesOrderInput {
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
    input: CreateSalesOrderInput,
    ctx: UseCaseContext
  ): Promise<Result<CreateSalesOrderOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId missing from context"));
    }

    const cached = await getIdempotentResult<CreateSalesOrderOutput>({
      idempotency: this.deps.idempotency,
      actionKey: "sales.create-order",
      tenantId: ctx.tenantId,
      idempotencyKey: input.idempotencyKey,
    });
    if (cached) {
      return ok(cached);
    }

    const customer = await this.deps.customerQuery.getCustomerBillingSnapshot(
      ctx.tenantId,
      input.customerPartyId
    );
    if (!customer) {
      return err(new NotFoundError("Customer not found"));
    }

    const now = this.deps.clock.now();
    const orderDate = input.orderDate ? parseLocalDate(input.orderDate) : null;
    const deliveryDate = input.deliveryDate ? parseLocalDate(input.deliveryDate) : null;
    const lineItems = buildLineItems({ idGenerator: this.deps.idGenerator, lineItems: input.lineItems });

    const order = SalesOrderAggregate.createDraft({
      id: this.deps.idGenerator.newId(),
      tenantId: ctx.tenantId,
      customerPartyId: input.customerPartyId,
      customerContactPartyId: input.customerContactPartyId ?? null,
      orderDate,
      deliveryDate,
      currency: input.currency,
      notes: input.notes,
      lineItems,
      sourceQuoteId: input.sourceQuoteId ?? null,
      now,
    });

    await this.deps.orderRepo.create(ctx.tenantId, order);

    const result = { order: toOrderDto(order) };
    await storeIdempotentResult({
      idempotency: this.deps.idempotency,
      actionKey: "sales.create-order",
      tenantId: ctx.tenantId,
      idempotencyKey: input.idempotencyKey,
      body: result,
    });

    return ok(result);
  }
}

export class UpdateSalesOrderUseCase extends BaseUseCase<
  UpdateSalesOrderInput,
  UpdateSalesOrderOutput
> {
  constructor(private readonly deps: OrderDeps) {
    super({ logger: deps.logger });
  }

  protected async handle(
    input: UpdateSalesOrderInput,
    ctx: UseCaseContext
  ): Promise<Result<UpdateSalesOrderOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId missing from context"));
    }

    const order = await this.deps.orderRepo.findById(ctx.tenantId, input.orderId);
    if (!order) {
      return err(new NotFoundError("Sales order not found"));
    }

    const now = this.deps.clock.now();
    if (input.headerPatch) {
      order.updateHeader(
        {
          customerPartyId: input.headerPatch.customerPartyId,
          customerContactPartyId: input.headerPatch.customerContactPartyId,
          orderDate: input.headerPatch.orderDate
            ? parseLocalDate(input.headerPatch.orderDate)
            : input.headerPatch.orderDate,
          deliveryDate: input.headerPatch.deliveryDate
            ? parseLocalDate(input.headerPatch.deliveryDate)
            : input.headerPatch.deliveryDate,
          currency: input.headerPatch.currency,
          notes: input.headerPatch.notes,
        },
        now
      );
    }

    if (input.lineItems) {
      const lineItems = buildLineItems({
        idGenerator: this.deps.idGenerator,
        lineItems: input.lineItems,
      });
      order.replaceLineItems(lineItems, now);
    }

    await this.deps.orderRepo.save(ctx.tenantId, order);
    return ok({ order: toOrderDto(order) });
  }
}

export class ConfirmSalesOrderUseCase extends BaseUseCase<
  ConfirmSalesOrderInput,
  ConfirmSalesOrderOutput
> {
  constructor(private readonly deps: OrderDeps) {
    super({ logger: deps.logger });
  }

  protected async handle(
    input: ConfirmSalesOrderInput,
    ctx: UseCaseContext
  ): Promise<Result<ConfirmSalesOrderOutput, UseCaseError>> {
    if (!ctx.tenantId || !ctx.userId) {
      return err(new ValidationError("tenantId and userId are required"));
    }

    const cached = await getIdempotentResult<ConfirmSalesOrderOutput>({
      idempotency: this.deps.idempotency,
      actionKey: "sales.confirm-order",
      tenantId: ctx.tenantId,
      idempotencyKey: input.idempotencyKey,
    });
    if (cached) {
      return ok(cached);
    }

    const order = await this.deps.orderRepo.findById(ctx.tenantId, input.orderId);
    if (!order) {
      return err(new NotFoundError("Sales order not found"));
    }

    const now = this.deps.clock.now();
    let settings = await this.deps.settingsRepo.findByTenant(ctx.tenantId);
    if (!settings) {
      settings = SalesSettingsAggregate.createDefault({
        id: this.deps.idGenerator.newId(),
        tenantId: ctx.tenantId,
        now,
      });
    }

    const number = await allocateUniqueNumber({
      next: () => settings!.allocateOrderNumber(),
      isTaken: (candidate) => this.deps.orderRepo.isOrderNumberTaken(ctx.tenantId!, candidate),
    });

    order.confirm(number, now, now);
    await this.deps.orderRepo.save(ctx.tenantId, order);
    await this.deps.settingsRepo.save(settings);

    const result = { order: toOrderDto(order) };
    await storeIdempotentResult({
      idempotency: this.deps.idempotency,
      actionKey: "sales.confirm-order",
      tenantId: ctx.tenantId,
      idempotencyKey: input.idempotencyKey,
      body: result,
    });

    return ok(result);
  }
}

export class FulfillSalesOrderUseCase extends BaseUseCase<
  FulfillSalesOrderInput,
  FulfillSalesOrderOutput
> {
  constructor(private readonly deps: OrderDeps) {
    super({ logger: deps.logger });
  }

  protected async handle(
    input: FulfillSalesOrderInput,
    ctx: UseCaseContext
  ): Promise<Result<FulfillSalesOrderOutput, UseCaseError>> {
    if (!ctx.tenantId || !ctx.userId) {
      return err(new ValidationError("tenantId and userId are required"));
    }

    const cached = await getIdempotentResult<FulfillSalesOrderOutput>({
      idempotency: this.deps.idempotency,
      actionKey: "sales.fulfill-order",
      tenantId: ctx.tenantId,
      idempotencyKey: input.idempotencyKey,
    });
    if (cached) {
      return ok(cached);
    }

    const order = await this.deps.orderRepo.findById(ctx.tenantId, input.orderId);
    if (!order) {
      return err(new NotFoundError("Sales order not found"));
    }

    const now = this.deps.clock.now();
    order.fulfill(now, now);
    await this.deps.orderRepo.save(ctx.tenantId, order);

    const result = { order: toOrderDto(order) };
    await storeIdempotentResult({
      idempotency: this.deps.idempotency,
      actionKey: "sales.fulfill-order",
      tenantId: ctx.tenantId,
      idempotencyKey: input.idempotencyKey,
      body: result,
    });

    return ok(result);
  }
}

export class CancelSalesOrderUseCase extends BaseUseCase<
  CancelSalesOrderInput,
  CancelSalesOrderOutput
> {
  constructor(private readonly deps: OrderDeps) {
    super({ logger: deps.logger });
  }

  protected async handle(
    input: CancelSalesOrderInput,
    ctx: UseCaseContext
  ): Promise<Result<CancelSalesOrderOutput, UseCaseError>> {
    if (!ctx.tenantId || !ctx.userId) {
      return err(new ValidationError("tenantId and userId are required"));
    }

    const cached = await getIdempotentResult<CancelSalesOrderOutput>({
      idempotency: this.deps.idempotency,
      actionKey: "sales.cancel-order",
      tenantId: ctx.tenantId,
      idempotencyKey: input.idempotencyKey,
    });
    if (cached) {
      return ok(cached);
    }

    const order = await this.deps.orderRepo.findById(ctx.tenantId, input.orderId);
    if (!order) {
      return err(new NotFoundError("Sales order not found"));
    }

    const now = this.deps.clock.now();
    order.cancel(now, now);
    await this.deps.orderRepo.save(ctx.tenantId, order);

    const result = { order: toOrderDto(order) };
    await storeIdempotentResult({
      idempotency: this.deps.idempotency,
      actionKey: "sales.cancel-order",
      tenantId: ctx.tenantId,
      idempotencyKey: input.idempotencyKey,
      body: result,
    });

    return ok(result);
  }
}

export class CreateInvoiceFromOrderUseCase extends BaseUseCase<
  CreateInvoiceFromOrderInput,
  CreateInvoiceFromOrderOutput
> {
  constructor(private readonly deps: OrderDeps) {
    super({ logger: deps.logger });
  }

  protected async handle(
    input: CreateInvoiceFromOrderInput,
    ctx: UseCaseContext
  ): Promise<Result<CreateInvoiceFromOrderOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId missing from context"));
    }

    const cached = await getIdempotentResult<CreateInvoiceFromOrderOutput>({
      idempotency: this.deps.idempotency,
      actionKey: "sales.create-invoice-from-order",
      tenantId: ctx.tenantId,
      idempotencyKey: input.idempotencyKey,
    });
    if (cached) {
      return ok(cached);
    }

    const order = await this.deps.orderRepo.findById(ctx.tenantId, input.orderId);
    if (!order) {
      return err(new NotFoundError("Sales order not found"));
    }

    const now = this.deps.clock.now();
    const invoice = SalesInvoiceAggregate.createDraft({
      id: this.deps.idGenerator.newId(),
      tenantId: ctx.tenantId,
      customerPartyId: order.customerPartyId,
      customerContactPartyId: order.customerContactPartyId,
      issueDate: order.orderDate,
      dueDate: null,
      currency: order.currency,
      paymentTerms: null,
      notes: order.notes,
      lineItems: order.lineItems.map((line) => ({ ...line })),
      sourceSalesOrderId: order.id,
      sourceQuoteId: order.sourceQuoteId,
      now,
    });

    await this.deps.invoiceRepo.create(ctx.tenantId, invoice);
    order.markInvoiced(invoice.id, now);
    await this.deps.orderRepo.save(ctx.tenantId, order);

    const payload = { invoice: toInvoiceDto(invoice) };
    await storeIdempotentResult({
      idempotency: this.deps.idempotency,
      actionKey: "sales.create-invoice-from-order",
      tenantId: ctx.tenantId,
      idempotencyKey: input.idempotencyKey,
      body: payload,
    });

    return ok(payload);
  }
}

export class GetSalesOrderUseCase extends BaseUseCase<GetSalesOrderInput, GetSalesOrderOutput> {
  constructor(private readonly deps: OrderDeps) {
    super({ logger: deps.logger });
  }

  protected async handle(
    input: GetSalesOrderInput,
    ctx: UseCaseContext
  ): Promise<Result<GetSalesOrderOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId missing from context"));
    }

    const order = await this.deps.orderRepo.findById(ctx.tenantId, input.orderId);
    if (!order) {
      return err(new NotFoundError("Sales order not found"));
    }
    return ok({ order: toOrderDto(order) });
  }
}

export class ListSalesOrdersUseCase extends BaseUseCase<
  ListSalesOrdersInput,
  ListSalesOrdersOutput
> {
  constructor(private readonly deps: OrderDeps) {
    super({ logger: deps.logger });
  }

  protected async handle(
    input: ListSalesOrdersInput,
    ctx: UseCaseContext
  ): Promise<Result<ListSalesOrdersOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId missing from context"));
    }

    const result = await this.deps.orderRepo.list(
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
      items: result.items.map(toOrderDto),
      nextCursor: result.nextCursor ?? null,
    });
  }
}
