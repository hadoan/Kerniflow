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
  CreatePurchaseOrderInput,
  CreatePurchaseOrderOutput,
  UpdatePurchaseOrderInput,
  UpdatePurchaseOrderOutput,
  ApprovePurchaseOrderInput,
  ApprovePurchaseOrderOutput,
  SendPurchaseOrderInput,
  SendPurchaseOrderOutput,
  ReceivePurchaseOrderInput,
  ReceivePurchaseOrderOutput,
  ClosePurchaseOrderInput,
  ClosePurchaseOrderOutput,
  CancelPurchaseOrderInput,
  CancelPurchaseOrderOutput,
  GetPurchaseOrderInput,
  GetPurchaseOrderOutput,
  ListPurchaseOrdersInput,
  ListPurchaseOrdersOutput,
} from "@corely/contracts";
import { PurchaseOrderAggregate } from "../../domain/purchase-order.aggregate";
import type { PurchaseOrderLineItem } from "../../domain/purchasing.types";
import type { PurchaseOrderRepositoryPort } from "../ports/purchase-order-repository.port";
import type { PurchasingSettingsRepositoryPort } from "../ports/settings-repository.port";
import { PurchasingSettingsAggregate } from "../../domain/settings.aggregate";
import { toPurchaseOrderDto } from "../mappers/purchasing-dto.mapper";
import { allocateUniqueNumber } from "./numbering";
import type { IdempotencyStoragePort } from "../../../../shared/ports/idempotency-storage.port";
import { getIdempotentResult, storeIdempotentResult } from "./idempotency";
import type { SupplierQueryPort } from "../ports/supplier-query.port";

const buildLineItems = (params: {
  idGenerator: IdGeneratorPort;
  lineItems: Array<{
    id?: string;
    description: string;
    quantity: number;
    unitCostCents: number;
    taxCode?: string;
    category?: string;
    sortOrder?: number;
  }>;
}): PurchaseOrderLineItem[] =>
  params.lineItems.map((item, idx) => ({
    id: item.id ?? params.idGenerator.newId(),
    description: item.description,
    quantity: item.quantity,
    unitCostCents: item.unitCostCents,
    taxCode: item.taxCode,
    category: item.category,
    sortOrder: item.sortOrder ?? idx,
  }));

type PurchaseOrderDeps = {
  logger: LoggerPort;
  repo: PurchaseOrderRepositoryPort;
  settingsRepo: PurchasingSettingsRepositoryPort;
  idGenerator: IdGeneratorPort;
  clock: ClockPort;
  idempotency: IdempotencyStoragePort;
  supplierQuery: SupplierQueryPort;
  audit: AuditPort;
};

export class CreatePurchaseOrderUseCase extends BaseUseCase<
  CreatePurchaseOrderInput,
  CreatePurchaseOrderOutput
> {
  constructor(private readonly services: PurchaseOrderDeps) {
    super({ logger: services.logger });
  }

  protected validate(input: CreatePurchaseOrderInput): CreatePurchaseOrderInput {
    if (!input.supplierPartyId) {
      throw new ValidationError("supplierPartyId is required");
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
    input: CreatePurchaseOrderInput,
    ctx: UseCaseContext
  ): Promise<Result<CreatePurchaseOrderOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId missing from context"));
    }

    const cached = await getIdempotentResult<CreatePurchaseOrderOutput>({
      idempotency: this.services.idempotency,
      actionKey: "purchasing.create-po",
      tenantId: ctx.tenantId,
      idempotencyKey: input.idempotencyKey,
    });
    if (cached) {
      return ok(cached);
    }

    const supplier = await this.services.supplierQuery.getSupplierById(
      ctx.tenantId,
      input.supplierPartyId
    );
    if (!supplier) {
      return err(new NotFoundError("Supplier not found"));
    }

    const now = this.services.clock.now();
    const orderDate = input.orderDate ? parseLocalDate(input.orderDate) : null;
    const expectedDeliveryDate = input.expectedDeliveryDate
      ? parseLocalDate(input.expectedDeliveryDate)
      : null;
    const lineItems = buildLineItems({
      idGenerator: this.services.idGenerator,
      lineItems: input.lineItems,
    });

    const purchaseOrder = PurchaseOrderAggregate.createDraft({
      id: this.services.idGenerator.newId(),
      tenantId: ctx.tenantId,
      supplierPartyId: input.supplierPartyId,
      supplierContactPartyId: input.supplierContactPartyId ?? null,
      orderDate,
      expectedDeliveryDate,
      currency: input.currency,
      notes: input.notes,
      lineItems,
      now,
    });

    await this.services.repo.create(ctx.tenantId, purchaseOrder);

    const result = { purchaseOrder: toPurchaseOrderDto(purchaseOrder) };
    await storeIdempotentResult({
      idempotency: this.services.idempotency,
      actionKey: "purchasing.create-po",
      tenantId: ctx.tenantId,
      idempotencyKey: input.idempotencyKey,
      body: result,
    });

    return ok(result);
  }
}

export class UpdatePurchaseOrderUseCase extends BaseUseCase<
  UpdatePurchaseOrderInput,
  UpdatePurchaseOrderOutput
> {
  constructor(private readonly services: PurchaseOrderDeps) {
    super({ logger: services.logger });
  }

  protected async handle(
    input: UpdatePurchaseOrderInput,
    ctx: UseCaseContext
  ): Promise<Result<UpdatePurchaseOrderOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId missing from context"));
    }

    const purchaseOrder = await this.services.repo.findById(ctx.tenantId, input.purchaseOrderId);
    if (!purchaseOrder) {
      return err(new NotFoundError("Purchase order not found"));
    }

    const now = this.services.clock.now();
    if (input.headerPatch) {
      purchaseOrder.updateHeader(
        {
          supplierPartyId: input.headerPatch.supplierPartyId,
          supplierContactPartyId: input.headerPatch.supplierContactPartyId,
          orderDate: input.headerPatch.orderDate
            ? parseLocalDate(input.headerPatch.orderDate)
            : undefined,
          expectedDeliveryDate: input.headerPatch.expectedDeliveryDate
            ? parseLocalDate(input.headerPatch.expectedDeliveryDate)
            : undefined,
          currency: input.headerPatch.currency,
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
      purchaseOrder.replaceLineItems(lineItems, now);
    }

    await this.services.repo.save(ctx.tenantId, purchaseOrder);
    return ok({ purchaseOrder: toPurchaseOrderDto(purchaseOrder) });
  }
}

export class ApprovePurchaseOrderUseCase extends BaseUseCase<
  ApprovePurchaseOrderInput,
  ApprovePurchaseOrderOutput
> {
  constructor(private readonly services: PurchaseOrderDeps) {
    super({ logger: services.logger });
  }

  protected async handle(
    input: ApprovePurchaseOrderInput,
    ctx: UseCaseContext
  ): Promise<Result<ApprovePurchaseOrderOutput, UseCaseError>> {
    if (!ctx.tenantId || !ctx.userId) {
      return err(new ValidationError("tenantId and userId are required"));
    }

    const cached = await getIdempotentResult<ApprovePurchaseOrderOutput>({
      idempotency: this.services.idempotency,
      actionKey: "purchasing.approve-po",
      tenantId: ctx.tenantId,
      idempotencyKey: input.idempotencyKey,
    });
    if (cached) {
      return ok(cached);
    }

    const purchaseOrder = await this.services.repo.findById(ctx.tenantId, input.purchaseOrderId);
    if (!purchaseOrder) {
      return err(new NotFoundError("Purchase order not found"));
    }

    let settings = await this.services.settingsRepo.findByTenant(ctx.tenantId);
    if (!settings) {
      settings = PurchasingSettingsAggregate.createDefault({
        id: this.services.idGenerator.newId(),
        tenantId: ctx.tenantId,
        now: this.services.clock.now(),
      });
    }

    const number = await allocateUniqueNumber({
      next: () => settings!.allocatePoNumber(),
      isTaken: (candidate) => this.services.repo.isPoNumberTaken(ctx.tenantId!, candidate),
    });

    const now = this.services.clock.now();
    try {
      purchaseOrder.approve(number, now, now);
    } catch (error) {
      return err(new ValidationError((error as Error).message));
    }

    await this.services.repo.save(ctx.tenantId, purchaseOrder);
    await this.services.settingsRepo.save(settings);
    await this.services.audit.log({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      action: "purchasing.po.approved",
      entityType: "PurchaseOrder",
      entityId: purchaseOrder.id,
      metadata: { poNumber: purchaseOrder.poNumber },
    });

    const result = { purchaseOrder: toPurchaseOrderDto(purchaseOrder) };
    await storeIdempotentResult({
      idempotency: this.services.idempotency,
      actionKey: "purchasing.approve-po",
      tenantId: ctx.tenantId,
      idempotencyKey: input.idempotencyKey,
      body: result,
    });

    return ok(result);
  }
}

export class SendPurchaseOrderUseCase extends BaseUseCase<
  SendPurchaseOrderInput,
  SendPurchaseOrderOutput
> {
  constructor(private readonly services: PurchaseOrderDeps) {
    super({ logger: services.logger });
  }

  protected async handle(
    input: SendPurchaseOrderInput,
    ctx: UseCaseContext
  ): Promise<Result<SendPurchaseOrderOutput, UseCaseError>> {
    if (!ctx.tenantId || !ctx.userId) {
      return err(new ValidationError("tenantId and userId are required"));
    }

    const purchaseOrder = await this.services.repo.findById(ctx.tenantId, input.purchaseOrderId);
    if (!purchaseOrder) {
      return err(new NotFoundError("Purchase order not found"));
    }

    const now = this.services.clock.now();
    try {
      purchaseOrder.markSent(now, now);
    } catch (error) {
      return err(new ValidationError((error as Error).message));
    }
    await this.services.repo.save(ctx.tenantId, purchaseOrder);

    await this.services.audit.log({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      action: "purchasing.po.sent",
      entityType: "PurchaseOrder",
      entityId: purchaseOrder.id,
      metadata: { poNumber: purchaseOrder.poNumber },
    });

    return ok({ purchaseOrder: toPurchaseOrderDto(purchaseOrder) });
  }
}

export class ReceivePurchaseOrderUseCase extends BaseUseCase<
  ReceivePurchaseOrderInput,
  ReceivePurchaseOrderOutput
> {
  constructor(private readonly services: PurchaseOrderDeps) {
    super({ logger: services.logger });
  }

  protected async handle(
    input: ReceivePurchaseOrderInput,
    ctx: UseCaseContext
  ): Promise<Result<ReceivePurchaseOrderOutput, UseCaseError>> {
    if (!ctx.tenantId || !ctx.userId) {
      return err(new ValidationError("tenantId and userId are required"));
    }

    const purchaseOrder = await this.services.repo.findById(ctx.tenantId, input.purchaseOrderId);
    if (!purchaseOrder) {
      return err(new NotFoundError("Purchase order not found"));
    }

    const now = this.services.clock.now();
    try {
      purchaseOrder.markReceived(now, now);
    } catch (error) {
      return err(new ValidationError((error as Error).message));
    }
    await this.services.repo.save(ctx.tenantId, purchaseOrder);

    await this.services.audit.log({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      action: "purchasing.po.received",
      entityType: "PurchaseOrder",
      entityId: purchaseOrder.id,
      metadata: { poNumber: purchaseOrder.poNumber },
    });

    return ok({ purchaseOrder: toPurchaseOrderDto(purchaseOrder) });
  }
}

export class ClosePurchaseOrderUseCase extends BaseUseCase<
  ClosePurchaseOrderInput,
  ClosePurchaseOrderOutput
> {
  constructor(private readonly services: PurchaseOrderDeps) {
    super({ logger: services.logger });
  }

  protected async handle(
    input: ClosePurchaseOrderInput,
    ctx: UseCaseContext
  ): Promise<Result<ClosePurchaseOrderOutput, UseCaseError>> {
    if (!ctx.tenantId || !ctx.userId) {
      return err(new ValidationError("tenantId and userId are required"));
    }

    const purchaseOrder = await this.services.repo.findById(ctx.tenantId, input.purchaseOrderId);
    if (!purchaseOrder) {
      return err(new NotFoundError("Purchase order not found"));
    }

    const now = this.services.clock.now();
    try {
      purchaseOrder.close(now, now);
    } catch (error) {
      return err(new ValidationError((error as Error).message));
    }
    await this.services.repo.save(ctx.tenantId, purchaseOrder);

    await this.services.audit.log({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      action: "purchasing.po.closed",
      entityType: "PurchaseOrder",
      entityId: purchaseOrder.id,
      metadata: { poNumber: purchaseOrder.poNumber },
    });

    return ok({ purchaseOrder: toPurchaseOrderDto(purchaseOrder) });
  }
}

export class CancelPurchaseOrderUseCase extends BaseUseCase<
  CancelPurchaseOrderInput,
  CancelPurchaseOrderOutput
> {
  constructor(private readonly services: PurchaseOrderDeps) {
    super({ logger: services.logger });
  }

  protected async handle(
    input: CancelPurchaseOrderInput,
    ctx: UseCaseContext
  ): Promise<Result<CancelPurchaseOrderOutput, UseCaseError>> {
    if (!ctx.tenantId || !ctx.userId) {
      return err(new ValidationError("tenantId and userId are required"));
    }

    const purchaseOrder = await this.services.repo.findById(ctx.tenantId, input.purchaseOrderId);
    if (!purchaseOrder) {
      return err(new NotFoundError("Purchase order not found"));
    }

    const now = this.services.clock.now();
    try {
      purchaseOrder.cancel(now, now);
    } catch (error) {
      return err(new ValidationError((error as Error).message));
    }
    await this.services.repo.save(ctx.tenantId, purchaseOrder);

    await this.services.audit.log({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      action: "purchasing.po.canceled",
      entityType: "PurchaseOrder",
      entityId: purchaseOrder.id,
      metadata: { poNumber: purchaseOrder.poNumber },
    });

    return ok({ purchaseOrder: toPurchaseOrderDto(purchaseOrder) });
  }
}

export class GetPurchaseOrderUseCase extends BaseUseCase<
  GetPurchaseOrderInput,
  GetPurchaseOrderOutput
> {
  constructor(private readonly services: PurchaseOrderDeps) {
    super({ logger: services.logger });
  }

  protected async handle(
    input: GetPurchaseOrderInput,
    ctx: UseCaseContext
  ): Promise<Result<GetPurchaseOrderOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId missing from context"));
    }

    const purchaseOrder = await this.services.repo.findById(ctx.tenantId, input.purchaseOrderId);
    if (!purchaseOrder) {
      return err(new NotFoundError("Purchase order not found"));
    }

    return ok({ purchaseOrder: toPurchaseOrderDto(purchaseOrder) });
  }
}

export class ListPurchaseOrdersUseCase extends BaseUseCase<
  ListPurchaseOrdersInput,
  ListPurchaseOrdersOutput
> {
  constructor(private readonly services: PurchaseOrderDeps) {
    super({ logger: services.logger });
  }

  protected async handle(
    input: ListPurchaseOrdersInput,
    ctx: UseCaseContext
  ): Promise<Result<ListPurchaseOrdersOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId missing from context"));
    }

    const result = await this.services.repo.list(ctx.tenantId, {
      status: input.status,
      supplierPartyId: input.supplierPartyId,
      fromDate: input.fromDate,
      toDate: input.toDate,
      search: input.search,
      cursor: input.cursor,
      pageSize: input.pageSize,
    });

    return ok({
      items: result.items.map(toPurchaseOrderDto),
      nextCursor: result.nextCursor ?? null,
    });
  }
}
