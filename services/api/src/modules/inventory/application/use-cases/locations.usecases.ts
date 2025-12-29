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
  CreateLocationInput,
  CreateLocationOutput,
  UpdateLocationInput,
  UpdateLocationOutput,
  ListLocationsInput,
  ListLocationsOutput,
} from "@kerniflow/contracts";
import type { LocationRepositoryPort } from "../ports/location-repository.port";
import type { WarehouseRepositoryPort } from "../ports/warehouse-repository.port";
import { toLocationDto } from "../mappers/inventory-dto.mapper";
import type { IdempotencyStoragePort } from "../../../shared/ports/idempotency-storage.port";
import { getIdempotentResult, storeIdempotentResult } from "./idempotency";

type LocationDeps = {
  logger: LoggerPort;
  repo: LocationRepositoryPort;
  warehouseRepo: WarehouseRepositoryPort;
  idGenerator: IdGeneratorPort;
  clock: ClockPort;
  idempotency: IdempotencyStoragePort;
  audit: AuditPort;
};

export class CreateLocationUseCase extends BaseUseCase<CreateLocationInput, CreateLocationOutput> {
  constructor(private readonly deps: LocationDeps) {
    super({ logger: deps.logger });
  }

  protected async handle(
    input: CreateLocationInput,
    ctx: UseCaseContext
  ): Promise<Result<CreateLocationOutput, UseCaseError>> {
    if (!ctx.tenantId || !ctx.userId) {
      return err(new ValidationError("tenantId and userId are required"));
    }

    const cached = await getIdempotentResult<CreateLocationOutput>({
      idempotency: this.deps.idempotency,
      actionKey: "inventory.create-location",
      tenantId: ctx.tenantId,
      idempotencyKey: input.idempotencyKey,
    });
    if (cached) {
      return ok(cached);
    }

    const warehouse = await this.deps.warehouseRepo.findById(ctx.tenantId, input.warehouseId);
    if (!warehouse) {
      return err(new NotFoundError("Warehouse not found"));
    }

    const now = this.deps.clock.now();
    const location = {
      id: this.deps.idGenerator.newId(),
      tenantId: ctx.tenantId,
      warehouseId: input.warehouseId,
      name: input.name,
      locationType: input.locationType,
      isActive: input.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    };

    await this.deps.repo.create(ctx.tenantId, location);
    await this.deps.audit.log({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      action: "inventory.location.created",
      entityType: "InventoryLocation",
      entityId: location.id,
    });

    const result = { location: toLocationDto(location) };
    await storeIdempotentResult({
      idempotency: this.deps.idempotency,
      actionKey: "inventory.create-location",
      tenantId: ctx.tenantId,
      idempotencyKey: input.idempotencyKey,
      body: result,
    });

    return ok(result);
  }
}

export class UpdateLocationUseCase extends BaseUseCase<UpdateLocationInput, UpdateLocationOutput> {
  constructor(private readonly deps: LocationDeps) {
    super({ logger: deps.logger });
  }

  protected async handle(
    input: UpdateLocationInput,
    ctx: UseCaseContext
  ): Promise<Result<UpdateLocationOutput, UseCaseError>> {
    if (!ctx.tenantId || !ctx.userId) {
      return err(new ValidationError("tenantId and userId are required"));
    }

    const location = await this.deps.repo.findById(ctx.tenantId, input.locationId);
    if (!location) {
      return err(new NotFoundError("Location not found"));
    }

    const updated = {
      ...location,
      name: input.patch.name ?? location.name,
      locationType: input.patch.locationType ?? location.locationType,
      isActive: input.patch.isActive ?? location.isActive,
      updatedAt: this.deps.clock.now(),
    };

    await this.deps.repo.save(ctx.tenantId, updated);
    await this.deps.audit.log({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      action: "inventory.location.updated",
      entityType: "InventoryLocation",
      entityId: updated.id,
    });

    return ok({ location: toLocationDto(updated) });
  }
}

export class ListLocationsUseCase extends BaseUseCase<ListLocationsInput, ListLocationsOutput> {
  constructor(private readonly deps: LocationDeps) {
    super({ logger: deps.logger });
  }

  protected async handle(
    input: ListLocationsInput,
    ctx: UseCaseContext
  ): Promise<Result<ListLocationsOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId missing from context"));
    }

    const locations = await this.deps.repo.listByWarehouse(ctx.tenantId, input.warehouseId);
    return ok({ items: locations.map(toLocationDto) });
  }
}
