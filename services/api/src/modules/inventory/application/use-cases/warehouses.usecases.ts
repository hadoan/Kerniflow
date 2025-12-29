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
  CreateWarehouseInput,
  CreateWarehouseOutput,
  UpdateWarehouseInput,
  UpdateWarehouseOutput,
  GetWarehouseInput,
  GetWarehouseOutput,
  ListWarehousesInput,
  ListWarehousesOutput,
} from "@kerniflow/contracts";
import type { WarehouseRepositoryPort } from "../ports/warehouse-repository.port";
import type { LocationRepositoryPort } from "../ports/location-repository.port";
import { toWarehouseDto } from "../mappers/inventory-dto.mapper";
import type { IdempotencyStoragePort } from "../../../shared/ports/idempotency-storage.port";
import { getIdempotentResult, storeIdempotentResult } from "./idempotency";

const DEFAULT_LOCATIONS = [
  { name: "Receiving", locationType: "RECEIVING" as const },
  { name: "Stock", locationType: "INTERNAL" as const },
  { name: "Shipping", locationType: "SHIPPING" as const },
];

type WarehouseDeps = {
  logger: LoggerPort;
  repo: WarehouseRepositoryPort;
  locationRepo: LocationRepositoryPort;
  idGenerator: IdGeneratorPort;
  clock: ClockPort;
  idempotency: IdempotencyStoragePort;
  audit: AuditPort;
};

export class CreateWarehouseUseCase extends BaseUseCase<
  CreateWarehouseInput,
  CreateWarehouseOutput
> {
  constructor(private readonly deps: WarehouseDeps) {
    super({ logger: deps.logger });
  }

  protected async handle(
    input: CreateWarehouseInput,
    ctx: UseCaseContext
  ): Promise<Result<CreateWarehouseOutput, UseCaseError>> {
    if (!ctx.tenantId || !ctx.userId) {
      return err(new ValidationError("tenantId and userId are required"));
    }

    const cached = await getIdempotentResult<CreateWarehouseOutput>({
      idempotency: this.deps.idempotency,
      actionKey: "inventory.create-warehouse",
      tenantId: ctx.tenantId,
      idempotencyKey: input.idempotencyKey,
    });
    if (cached) {
      return ok(cached);
    }

    const existingDefault = await this.deps.repo.findDefault(ctx.tenantId);
    const isDefault = input.isDefault ?? !existingDefault;

    const now = this.deps.clock.now();
    const warehouse = {
      id: this.deps.idGenerator.newId(),
      tenantId: ctx.tenantId,
      name: input.name,
      isDefault,
      address: input.address ?? null,
      createdAt: now,
      updatedAt: now,
    };

    await this.deps.repo.create(ctx.tenantId, warehouse);

    for (const loc of DEFAULT_LOCATIONS) {
      await this.deps.locationRepo.create(ctx.tenantId, {
        id: this.deps.idGenerator.newId(),
        tenantId: ctx.tenantId,
        warehouseId: warehouse.id,
        name: loc.name,
        locationType: loc.locationType,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
    }

    await this.deps.audit.log({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      action: "inventory.warehouse.created",
      entityType: "InventoryWarehouse",
      entityId: warehouse.id,
    });

    const result = { warehouse: toWarehouseDto(warehouse) };
    await storeIdempotentResult({
      idempotency: this.deps.idempotency,
      actionKey: "inventory.create-warehouse",
      tenantId: ctx.tenantId,
      idempotencyKey: input.idempotencyKey,
      body: result,
    });

    return ok(result);
  }
}

export class UpdateWarehouseUseCase extends BaseUseCase<
  UpdateWarehouseInput,
  UpdateWarehouseOutput
> {
  constructor(private readonly deps: WarehouseDeps) {
    super({ logger: deps.logger });
  }

  protected async handle(
    input: UpdateWarehouseInput,
    ctx: UseCaseContext
  ): Promise<Result<UpdateWarehouseOutput, UseCaseError>> {
    if (!ctx.tenantId || !ctx.userId) {
      return err(new ValidationError("tenantId and userId are required"));
    }

    const warehouse = await this.deps.repo.findById(ctx.tenantId, input.warehouseId);
    if (!warehouse) {
      return err(new NotFoundError("Warehouse not found"));
    }

    const updated = {
      ...warehouse,
      name: input.patch.name ?? warehouse.name,
      isDefault: input.patch.isDefault ?? warehouse.isDefault,
      address:
        input.patch.address !== undefined
          ? (input.patch.address ?? null)
          : (warehouse.address ?? null),
      updatedAt: this.deps.clock.now(),
    };

    await this.deps.repo.save(ctx.tenantId, updated);
    await this.deps.audit.log({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      action: "inventory.warehouse.updated",
      entityType: "InventoryWarehouse",
      entityId: updated.id,
    });

    return ok({ warehouse: toWarehouseDto(updated) });
  }
}

export class GetWarehouseUseCase extends BaseUseCase<GetWarehouseInput, GetWarehouseOutput> {
  constructor(private readonly deps: WarehouseDeps) {
    super({ logger: deps.logger });
  }

  protected async handle(
    input: GetWarehouseInput,
    ctx: UseCaseContext
  ): Promise<Result<GetWarehouseOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId missing from context"));
    }

    const warehouse = await this.deps.repo.findById(ctx.tenantId, input.warehouseId);
    if (!warehouse) {
      return err(new NotFoundError("Warehouse not found"));
    }

    return ok({ warehouse: toWarehouseDto(warehouse) });
  }
}

export class ListWarehousesUseCase extends BaseUseCase<ListWarehousesInput, ListWarehousesOutput> {
  constructor(private readonly deps: WarehouseDeps) {
    super({ logger: deps.logger });
  }

  protected async handle(
    input: ListWarehousesInput,
    ctx: UseCaseContext
  ): Promise<Result<ListWarehousesOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId missing from context"));
    }

    const result = await this.deps.repo.list(ctx.tenantId, {
      cursor: input.cursor,
      pageSize: input.pageSize,
    });

    return ok({
      items: result.items.map(toWarehouseDto),
      nextCursor: result.nextCursor ?? null,
    });
  }
}
