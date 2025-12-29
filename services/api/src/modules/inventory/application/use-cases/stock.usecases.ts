import {
  BaseUseCase,
  type LoggerPort,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ValidationError,
  err,
  ok,
} from "@kerniflow/kernel";
import type {
  GetOnHandInput,
  GetOnHandOutput,
  GetAvailableInput,
  GetAvailableOutput,
  ListStockMovesInput,
  ListStockMovesOutput,
  ListReservationsInput,
  ListReservationsOutput,
} from "@kerniflow/contracts";
import type { StockMoveRepositoryPort } from "../ports/stock-move-repository.port";
import type { StockReservationRepositoryPort } from "../ports/stock-reservation-repository.port";
import type { LocationRepositoryPort } from "../ports/location-repository.port";
import {
  toStockLevelDto,
  toStockMoveDto,
  toStockReservationDto,
} from "../mappers/inventory-dto.mapper";

const buildLocationFilter = async (params: {
  tenantId: string;
  warehouseId?: string;
  locationId?: string;
  locationRepo: LocationRepositoryPort;
}): Promise<string[] | undefined> => {
  if (params.locationId) {
    return [params.locationId];
  }
  if (params.warehouseId) {
    const locations = await params.locationRepo.listByWarehouse(
      params.tenantId,
      params.warehouseId
    );
    return locations.map((location) => location.id);
  }
  return undefined;
};

type StockDeps = {
  logger: LoggerPort;
  moveRepo: StockMoveRepositoryPort;
  reservationRepo: StockReservationRepositoryPort;
  locationRepo: LocationRepositoryPort;
};

export class GetOnHandUseCase extends BaseUseCase<GetOnHandInput, GetOnHandOutput> {
  constructor(private readonly deps: StockDeps) {
    super({ logger: deps.logger });
  }

  protected async handle(
    input: GetOnHandInput,
    ctx: UseCaseContext
  ): Promise<Result<GetOnHandOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId missing from context"));
    }

    const locationIds = await buildLocationFilter({
      tenantId: ctx.tenantId,
      warehouseId: input.warehouseId,
      locationId: input.locationId,
      locationRepo: this.deps.locationRepo,
    });

    const onHand = await this.deps.moveRepo.sumByProductLocation(ctx.tenantId, {
      productIds: input.productId ? [input.productId] : undefined,
      locationIds,
    });

    const reservations = await this.deps.reservationRepo.sumActiveByProductLocation(ctx.tenantId, {
      productIds: input.productId ? [input.productId] : undefined,
      locationIds,
    });

    const key = (productId: string, locationId: string) => `${productId}:${locationId}`;
    const reservedMap = new Map<string, number>();
    reservations.forEach((row) => {
      reservedMap.set(key(row.productId, row.locationId), row.reservedQty);
    });

    const items = onHand.map((row) => {
      const reservedQty = reservedMap.get(key(row.productId, row.locationId)) ?? 0;
      const availableQty = row.quantityDelta - reservedQty;
      return toStockLevelDto({
        productId: row.productId,
        locationId: row.locationId,
        onHandQty: row.quantityDelta,
        reservedQty,
        availableQty,
      });
    });

    return ok({ items });
  }
}

export class GetAvailableUseCase extends BaseUseCase<GetAvailableInput, GetAvailableOutput> {
  constructor(private readonly deps: StockDeps) {
    super({ logger: deps.logger });
  }

  protected async handle(
    input: GetAvailableInput,
    ctx: UseCaseContext
  ): Promise<Result<GetAvailableOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId missing from context"));
    }

    const locationIds = await buildLocationFilter({
      tenantId: ctx.tenantId,
      warehouseId: input.warehouseId,
      locationId: input.locationId,
      locationRepo: this.deps.locationRepo,
    });

    const onHand = await this.deps.moveRepo.sumByProductLocation(ctx.tenantId, {
      productIds: input.productId ? [input.productId] : undefined,
      locationIds,
    });

    const reservations = await this.deps.reservationRepo.sumActiveByProductLocation(ctx.tenantId, {
      productIds: input.productId ? [input.productId] : undefined,
      locationIds,
    });

    const key = (productId: string, locationId: string) => `${productId}:${locationId}`;
    const reservedMap = new Map<string, number>();
    reservations.forEach((row) => {
      reservedMap.set(key(row.productId, row.locationId), row.reservedQty);
    });

    const items = onHand.map((row) => {
      const reservedQty = reservedMap.get(key(row.productId, row.locationId)) ?? 0;
      const availableQty = row.quantityDelta - reservedQty;
      return toStockLevelDto({
        productId: row.productId,
        locationId: row.locationId,
        onHandQty: row.quantityDelta,
        reservedQty,
        availableQty,
      });
    });

    return ok({ items });
  }
}

export class ListStockMovesUseCase extends BaseUseCase<ListStockMovesInput, ListStockMovesOutput> {
  constructor(private readonly deps: StockDeps) {
    super({ logger: deps.logger });
  }

  protected async handle(
    input: ListStockMovesInput,
    ctx: UseCaseContext
  ): Promise<Result<ListStockMovesOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId missing from context"));
    }

    const locationIds = await buildLocationFilter({
      tenantId: ctx.tenantId,
      warehouseId: input.warehouseId,
      locationId: undefined,
      locationRepo: this.deps.locationRepo,
    });

    const result = await this.deps.moveRepo.list(ctx.tenantId, {
      productId: input.productId,
      locationIds,
      fromDate: input.fromDate,
      toDate: input.toDate,
      cursor: input.cursor,
      pageSize: input.pageSize,
    });

    return ok({
      items: result.items.map(toStockMoveDto),
      nextCursor: result.nextCursor ?? null,
    });
  }
}

export class ListReservationsUseCase extends BaseUseCase<
  ListReservationsInput,
  ListReservationsOutput
> {
  constructor(private readonly deps: StockDeps) {
    super({ logger: deps.logger });
  }

  protected async handle(
    input: ListReservationsInput,
    ctx: UseCaseContext
  ): Promise<Result<ListReservationsOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId missing from context"));
    }

    const result = await this.deps.reservationRepo.list(ctx.tenantId, {
      productId: input.productId,
      documentId: input.documentId,
      cursor: input.cursor,
      pageSize: input.pageSize,
    });

    return ok({
      items: result.items.map(toStockReservationDto),
      nextCursor: result.nextCursor ?? null,
    });
  }
}
