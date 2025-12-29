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
} from "@kerniflow/kernel";
import type {
  CreateProductInput,
  CreateProductOutput,
  UpdateProductInput,
  UpdateProductOutput,
  GetProductInput,
  GetProductOutput,
  ListProductsInput,
  ListProductsOutput,
  ActivateProductInput,
  ActivateProductOutput,
  DeactivateProductInput,
  DeactivateProductOutput,
} from "@kerniflow/contracts";
import type { ProductRepositoryPort } from "../ports/product-repository.port";
import { toProductDto } from "../mappers/inventory-dto.mapper";
import type { IdempotencyStoragePort } from "../../../shared/ports/idempotency-storage.port";
import { getIdempotentResult, storeIdempotentResult } from "./idempotency";

type ProductDeps = {
  logger: LoggerPort;
  repo: ProductRepositoryPort;
  idGenerator: IdGeneratorPort;
  clock: ClockPort;
  idempotency: IdempotencyStoragePort;
  audit: AuditPort;
};

export class CreateProductUseCase extends BaseUseCase<CreateProductInput, CreateProductOutput> {
  constructor(private readonly deps: ProductDeps) {
    super({ logger: deps.logger });
  }

  protected async handle(
    input: CreateProductInput,
    ctx: UseCaseContext
  ): Promise<Result<CreateProductOutput, UseCaseError>> {
    if (!ctx.tenantId || !ctx.userId) {
      return err(new ValidationError("tenantId and userId are required"));
    }

    const cached = await getIdempotentResult<CreateProductOutput>({
      idempotency: this.deps.idempotency,
      actionKey: "inventory.create-product",
      tenantId: ctx.tenantId,
      idempotencyKey: input.idempotencyKey,
    });
    if (cached) {
      return ok(cached);
    }

    const existing = await this.deps.repo.findBySku(ctx.tenantId, input.sku);
    if (existing) {
      return err(new ValidationError("SKU already exists", { sku: input.sku }));
    }

    const now = this.deps.clock.now();
    const product = {
      id: this.deps.idGenerator.newId(),
      tenantId: ctx.tenantId,
      sku: input.sku,
      name: input.name,
      productType: input.productType,
      unitOfMeasure: input.unitOfMeasure,
      barcode: input.barcode ?? null,
      defaultSalesPriceCents: input.defaultSalesPriceCents ?? null,
      defaultPurchaseCostCents: input.defaultPurchaseCostCents ?? null,
      isActive: input.isActive ?? true,
      tags: input.tags ?? [],
      createdAt: now,
      updatedAt: now,
    };

    await this.deps.repo.create(ctx.tenantId, product);

    await this.deps.audit.log({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      action: "inventory.product.created",
      entityType: "InventoryProduct",
      entityId: product.id,
    });

    const result = { product: toProductDto(product) };
    await storeIdempotentResult({
      idempotency: this.deps.idempotency,
      actionKey: "inventory.create-product",
      tenantId: ctx.tenantId,
      idempotencyKey: input.idempotencyKey,
      body: result,
    });

    return ok(result);
  }
}

export class UpdateProductUseCase extends BaseUseCase<UpdateProductInput, UpdateProductOutput> {
  constructor(private readonly deps: ProductDeps) {
    super({ logger: deps.logger });
  }

  protected async handle(
    input: UpdateProductInput,
    ctx: UseCaseContext
  ): Promise<Result<UpdateProductOutput, UseCaseError>> {
    if (!ctx.tenantId || !ctx.userId) {
      return err(new ValidationError("tenantId and userId are required"));
    }

    const product = await this.deps.repo.findById(ctx.tenantId, input.productId);
    if (!product) {
      return err(new NotFoundError("Product not found"));
    }

    if (input.patch.sku && input.patch.sku !== product.sku) {
      const existing = await this.deps.repo.findBySku(ctx.tenantId, input.patch.sku);
      if (existing) {
        return err(new ValidationError("SKU already exists", { sku: input.patch.sku }));
      }
    }

    const updated = {
      ...product,
      sku: input.patch.sku ?? product.sku,
      name: input.patch.name ?? product.name,
      productType: input.patch.productType ?? product.productType,
      unitOfMeasure: input.patch.unitOfMeasure ?? product.unitOfMeasure,
      barcode:
        input.patch.barcode !== undefined
          ? (input.patch.barcode ?? null)
          : (product.barcode ?? null),
      defaultSalesPriceCents:
        input.patch.defaultSalesPriceCents !== undefined
          ? (input.patch.defaultSalesPriceCents ?? null)
          : (product.defaultSalesPriceCents ?? null),
      defaultPurchaseCostCents:
        input.patch.defaultPurchaseCostCents !== undefined
          ? (input.patch.defaultPurchaseCostCents ?? null)
          : (product.defaultPurchaseCostCents ?? null),
      isActive: input.patch.isActive ?? product.isActive,
      tags: input.patch.tags ?? product.tags,
      updatedAt: this.deps.clock.now(),
    };

    await this.deps.repo.save(ctx.tenantId, updated);
    await this.deps.audit.log({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      action: "inventory.product.updated",
      entityType: "InventoryProduct",
      entityId: updated.id,
    });

    return ok({ product: toProductDto(updated) });
  }
}

export class ActivateProductUseCase extends BaseUseCase<
  ActivateProductInput,
  ActivateProductOutput
> {
  constructor(private readonly deps: ProductDeps) {
    super({ logger: deps.logger });
  }

  protected async handle(
    input: ActivateProductInput,
    ctx: UseCaseContext
  ): Promise<Result<ActivateProductOutput, UseCaseError>> {
    if (!ctx.tenantId || !ctx.userId) {
      return err(new ValidationError("tenantId and userId are required"));
    }

    const product = await this.deps.repo.findById(ctx.tenantId, input.productId);
    if (!product) {
      return err(new NotFoundError("Product not found"));
    }

    const updated = { ...product, isActive: true, updatedAt: this.deps.clock.now() };
    await this.deps.repo.save(ctx.tenantId, updated);
    await this.deps.audit.log({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      action: "inventory.product.activated",
      entityType: "InventoryProduct",
      entityId: updated.id,
    });

    return ok({ product: toProductDto(updated) });
  }
}

export class DeactivateProductUseCase extends BaseUseCase<
  DeactivateProductInput,
  DeactivateProductOutput
> {
  constructor(private readonly deps: ProductDeps) {
    super({ logger: deps.logger });
  }

  protected async handle(
    input: DeactivateProductInput,
    ctx: UseCaseContext
  ): Promise<Result<DeactivateProductOutput, UseCaseError>> {
    if (!ctx.tenantId || !ctx.userId) {
      return err(new ValidationError("tenantId and userId are required"));
    }

    const product = await this.deps.repo.findById(ctx.tenantId, input.productId);
    if (!product) {
      return err(new NotFoundError("Product not found"));
    }

    const updated = { ...product, isActive: false, updatedAt: this.deps.clock.now() };
    await this.deps.repo.save(ctx.tenantId, updated);
    await this.deps.audit.log({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      action: "inventory.product.deactivated",
      entityType: "InventoryProduct",
      entityId: updated.id,
    });

    return ok({ product: toProductDto(updated) });
  }
}

export class GetProductUseCase extends BaseUseCase<GetProductInput, GetProductOutput> {
  constructor(private readonly deps: ProductDeps) {
    super({ logger: deps.logger });
  }

  protected async handle(
    input: GetProductInput,
    ctx: UseCaseContext
  ): Promise<Result<GetProductOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId missing from context"));
    }

    const product = await this.deps.repo.findById(ctx.tenantId, input.productId);
    if (!product) {
      return err(new NotFoundError("Product not found"));
    }

    return ok({ product: toProductDto(product) });
  }
}

export class ListProductsUseCase extends BaseUseCase<ListProductsInput, ListProductsOutput> {
  constructor(private readonly deps: ProductDeps) {
    super({ logger: deps.logger });
  }

  protected async handle(
    input: ListProductsInput,
    ctx: UseCaseContext
  ): Promise<Result<ListProductsOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId missing from context"));
    }

    const result = await this.deps.repo.list(ctx.tenantId, {
      search: input.search,
      type: input.type,
      isActive: input.isActive,
      cursor: input.cursor,
      pageSize: input.pageSize,
    });

    return ok({
      items: result.items.map(toProductDto),
      nextCursor: result.nextCursor ?? null,
    });
  }
}
