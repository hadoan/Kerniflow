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
} from "@corely/kernel";
import type {
  ListReorderPoliciesInput,
  ListReorderPoliciesOutput,
  CreateReorderPolicyInput,
  CreateReorderPolicyOutput,
  UpdateReorderPolicyInput,
  UpdateReorderPolicyOutput,
  GetReorderSuggestionsInput,
  GetReorderSuggestionsOutput,
  GetLowStockInput,
  GetLowStockOutput,
} from "@corely/contracts";
import type { ReorderPolicyRepositoryPort } from "../ports/reorder-policy-repository.port";
import type { ProductRepositoryPort } from "../ports/product-repository.port";
import type { WarehouseRepositoryPort } from "../ports/warehouse-repository.port";
import type { StockMoveRepositoryPort } from "../ports/stock-move-repository.port";
import type { StockReservationRepositoryPort } from "../ports/stock-reservation-repository.port";
import type { LocationRepositoryPort } from "../ports/location-repository.port";
import { toReorderPolicyDto, toReorderSuggestionDto } from "../mappers/inventory-dto.mapper";
import type { IdempotencyStoragePort } from "../../../../shared/ports/idempotency-storage.port";
import { getIdempotentResult, storeIdempotentResult } from "./idempotency";

const sumByProduct = (rows: Array<{ productId: string; value: number }>) => {
  const map = new Map<string, number>();
  rows.forEach((row) => {
    map.set(row.productId, (map.get(row.productId) ?? 0) + row.value);
  });
  return map;
};

const buildSuggestions = async (params: {
  tenantId: string;
  policies: Array<{
    productId: string;
    warehouseId: string;
    reorderPoint?: number | null;
    minQty: number;
    preferredSupplierPartyId?: string | null;
  }>;
  thresholdMode: "MIN" | "REORDER_POINT";
  locationRepo: LocationRepositoryPort;
  moveRepo: StockMoveRepositoryPort;
  reservationRepo: StockReservationRepositoryPort;
}): Promise<ReturnType<typeof toReorderSuggestionDto>[]> => {
  const suggestions: ReturnType<typeof toReorderSuggestionDto>[] = [];
  const grouped = new Map<string, Array<(typeof params.policies)[number]>>();

  params.policies.forEach((policy) => {
    const list = grouped.get(policy.warehouseId) ?? [];
    list.push(policy);
    grouped.set(policy.warehouseId, list);
  });

  for (const [warehouseId, groupPolicies] of grouped.entries()) {
    const locations = await params.locationRepo.listByWarehouse(params.tenantId, warehouseId);
    const locationIds = locations.map((loc) => loc.id);
    const productIds = groupPolicies.map((policy) => policy.productId);

    const onHand = await params.moveRepo.sumByProductLocation(params.tenantId, {
      productIds,
      locationIds,
    });
    const reserved = await params.reservationRepo.sumActiveByProductLocation(params.tenantId, {
      productIds,
      locationIds,
    });

    const onHandMap = sumByProduct(
      onHand.map((row) => ({
        productId: row.productId,
        value: row.quantityDelta,
      }))
    );
    const reservedMap = sumByProduct(
      reserved.map((row) => ({
        productId: row.productId,
        value: row.reservedQty,
      }))
    );

    groupPolicies.forEach((policy) => {
      const availableQty =
        (onHandMap.get(policy.productId) ?? 0) - (reservedMap.get(policy.productId) ?? 0);
      const threshold =
        params.thresholdMode === "MIN" ? policy.minQty : (policy.reorderPoint ?? policy.minQty);
      if (availableQty <= threshold) {
        suggestions.push(
          toReorderSuggestionDto({
            productId: policy.productId,
            warehouseId,
            availableQty,
            reorderPoint: policy.reorderPoint ?? null,
            minQty: policy.minQty,
            suggestedQty: Math.max(threshold - availableQty, 0),
            preferredSupplierPartyId: policy.preferredSupplierPartyId ?? null,
          })
        );
      }
    });
  }

  return suggestions;
};

type ReorderDeps = {
  logger: LoggerPort;
  repo: ReorderPolicyRepositoryPort;
  productRepo: ProductRepositoryPort;
  warehouseRepo: WarehouseRepositoryPort;
  locationRepo: LocationRepositoryPort;
  moveRepo: StockMoveRepositoryPort;
  reservationRepo: StockReservationRepositoryPort;
  idGenerator: IdGeneratorPort;
  clock: ClockPort;
  idempotency: IdempotencyStoragePort;
  audit: AuditPort;
};

export class ListReorderPoliciesUseCase extends BaseUseCase<
  ListReorderPoliciesInput,
  ListReorderPoliciesOutput
> {
  constructor(private readonly reorderDeps: ReorderDeps) {
    super({ logger: reorderDeps.logger });
  }

  protected async handle(
    input: ListReorderPoliciesInput,
    ctx: UseCaseContext
  ): Promise<Result<ListReorderPoliciesOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId missing from context"));
    }

    const policies = await this.reorderDeps.repo.list(ctx.tenantId, {
      productId: input.productId,
      warehouseId: input.warehouseId,
    });

    return ok({ items: policies.map(toReorderPolicyDto) });
  }
}

export class CreateReorderPolicyUseCase extends BaseUseCase<
  CreateReorderPolicyInput,
  CreateReorderPolicyOutput
> {
  constructor(private readonly reorderDeps: ReorderDeps) {
    super({ logger: reorderDeps.logger });
  }

  protected async handle(
    input: CreateReorderPolicyInput,
    ctx: UseCaseContext
  ): Promise<Result<CreateReorderPolicyOutput, UseCaseError>> {
    if (!ctx.tenantId || !ctx.userId) {
      return err(new ValidationError("tenantId and userId are required"));
    }

    const cached = await getIdempotentResult<CreateReorderPolicyOutput>({
      idempotency: this.reorderDeps.idempotency,
      actionKey: "inventory.create-reorder-policy",
      tenantId: ctx.tenantId,
      idempotencyKey: input.idempotencyKey,
    });
    if (cached) {
      return ok(cached);
    }

    const product = await this.reorderDeps.productRepo.findById(ctx.tenantId, input.productId);
    if (!product) {
      return err(new NotFoundError("Product not found"));
    }

    const warehouse = await this.reorderDeps.warehouseRepo.findById(
      ctx.tenantId,
      input.warehouseId
    );
    if (!warehouse) {
      return err(new NotFoundError("Warehouse not found"));
    }

    const existing = await this.reorderDeps.repo.findByProductWarehouse(
      ctx.tenantId,
      input.productId,
      input.warehouseId
    );
    if (existing) {
      return err(new ValidationError("Reorder policy already exists"));
    }

    const now = this.reorderDeps.clock.now();
    const policy = {
      id: this.reorderDeps.idGenerator.newId(),
      tenantId: ctx.tenantId,
      productId: input.productId,
      warehouseId: input.warehouseId,
      minQty: input.minQty,
      maxQty: input.maxQty ?? null,
      reorderPoint: input.reorderPoint ?? null,
      preferredSupplierPartyId: input.preferredSupplierPartyId ?? null,
      leadTimeDays: input.leadTimeDays ?? null,
      isActive: input.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    };

    await this.reorderDeps.repo.create(ctx.tenantId, policy);
    await this.reorderDeps.audit.log({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      action: "inventory.reorder-policy.created",
      entityType: "ReorderPolicy",
      entityId: policy.id,
    });

    const result = { policy: toReorderPolicyDto(policy) };
    await storeIdempotentResult({
      idempotency: this.reorderDeps.idempotency,
      actionKey: "inventory.create-reorder-policy",
      tenantId: ctx.tenantId,
      idempotencyKey: input.idempotencyKey,
      body: result,
    });

    return ok(result);
  }
}

export class UpdateReorderPolicyUseCase extends BaseUseCase<
  UpdateReorderPolicyInput,
  UpdateReorderPolicyOutput
> {
  constructor(private readonly reorderDeps: ReorderDeps) {
    super({ logger: reorderDeps.logger });
  }

  protected async handle(
    input: UpdateReorderPolicyInput,
    ctx: UseCaseContext
  ): Promise<Result<UpdateReorderPolicyOutput, UseCaseError>> {
    if (!ctx.tenantId || !ctx.userId) {
      return err(new ValidationError("tenantId and userId are required"));
    }

    const policy = await this.reorderDeps.repo.findById(ctx.tenantId, input.reorderPolicyId);
    if (!policy) {
      return err(new NotFoundError("Reorder policy not found"));
    }

    const updated = {
      ...policy,
      minQty: input.patch.minQty ?? policy.minQty,
      maxQty:
        input.patch.maxQty !== undefined ? (input.patch.maxQty ?? null) : (policy.maxQty ?? null),
      reorderPoint:
        input.patch.reorderPoint !== undefined
          ? (input.patch.reorderPoint ?? null)
          : (policy.reorderPoint ?? null),
      preferredSupplierPartyId:
        input.patch.preferredSupplierPartyId !== undefined
          ? (input.patch.preferredSupplierPartyId ?? null)
          : (policy.preferredSupplierPartyId ?? null),
      leadTimeDays:
        input.patch.leadTimeDays !== undefined
          ? (input.patch.leadTimeDays ?? null)
          : (policy.leadTimeDays ?? null),
      isActive: input.patch.isActive ?? policy.isActive,
      updatedAt: this.reorderDeps.clock.now(),
    };

    await this.reorderDeps.repo.save(ctx.tenantId, updated);
    await this.reorderDeps.audit.log({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      action: "inventory.reorder-policy.updated",
      entityType: "ReorderPolicy",
      entityId: updated.id,
    });

    return ok({ policy: toReorderPolicyDto(updated) });
  }
}

export class GetReorderSuggestionsUseCase extends BaseUseCase<
  GetReorderSuggestionsInput,
  GetReorderSuggestionsOutput
> {
  constructor(private readonly reorderDeps: ReorderDeps) {
    super({ logger: reorderDeps.logger });
  }

  protected async handle(
    input: GetReorderSuggestionsInput,
    ctx: UseCaseContext
  ): Promise<Result<GetReorderSuggestionsOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId missing from context"));
    }

    const policies = await this.reorderDeps.repo.list(ctx.tenantId, {
      warehouseId: input.warehouseId,
    });

    const items = await buildSuggestions({
      tenantId: ctx.tenantId,
      policies,
      thresholdMode: "REORDER_POINT",
      locationRepo: this.reorderDeps.locationRepo,
      moveRepo: this.reorderDeps.moveRepo,
      reservationRepo: this.reorderDeps.reservationRepo,
    });
    return ok({ items });
  }
}

export class GetLowStockUseCase extends BaseUseCase<GetLowStockInput, GetLowStockOutput> {
  constructor(private readonly reorderDeps: ReorderDeps) {
    super({ logger: reorderDeps.logger });
  }

  protected async handle(
    input: GetLowStockInput,
    ctx: UseCaseContext
  ): Promise<Result<GetLowStockOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId missing from context"));
    }

    const policies = await this.reorderDeps.repo.list(ctx.tenantId, {
      warehouseId: input.warehouseId,
    });

    const thresholdMode = input.thresholdMode ?? "REORDER_POINT";
    const items = await buildSuggestions({
      tenantId: ctx.tenantId,
      policies,
      thresholdMode,
      locationRepo: this.reorderDeps.locationRepo,
      moveRepo: this.reorderDeps.moveRepo,
      reservationRepo: this.reorderDeps.reservationRepo,
    });

    return ok({ items });
  }
}
