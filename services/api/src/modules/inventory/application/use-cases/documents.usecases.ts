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
} from "@kerniflow/kernel";
import type {
  CreateInventoryDocumentInput,
  CreateInventoryDocumentOutput,
  UpdateInventoryDocumentInput,
  UpdateInventoryDocumentOutput,
  ConfirmInventoryDocumentInput,
  ConfirmInventoryDocumentOutput,
  PostInventoryDocumentInput,
  PostInventoryDocumentOutput,
  CancelInventoryDocumentInput,
  CancelInventoryDocumentOutput,
  GetInventoryDocumentInput,
  GetInventoryDocumentOutput,
  ListInventoryDocumentsInput,
  ListInventoryDocumentsOutput,
} from "@kerniflow/contracts";
import type { InventoryDocumentLine } from "../../domain/inventory.types";
import { InventoryDocumentAggregate } from "../../domain/inventory-document.aggregate";
import type { InventoryDocumentRepositoryPort } from "../ports/document-repository.port";
import type { ProductRepositoryPort } from "../ports/product-repository.port";
import type { LocationRepositoryPort } from "../ports/location-repository.port";
import type { WarehouseRepositoryPort } from "../ports/warehouse-repository.port";
import type { StockMoveRepositoryPort } from "../ports/stock-move-repository.port";
import type { StockReservationRepositoryPort } from "../ports/stock-reservation-repository.port";
import type { InventorySettingsRepositoryPort } from "../ports/settings-repository.port";
import { InventorySettingsAggregate } from "../../domain/settings.aggregate";
import { toInventoryDocumentDto } from "../mappers/inventory-dto.mapper";
import type { IdempotencyStoragePort } from "../../../shared/ports/idempotency-storage.port";
import { getIdempotentResult, storeIdempotentResult } from "./idempotency";
import { allocateUniqueNumber } from "./numbering";
import type { InventoryDocumentType, StockMove } from "../../domain/inventory.types";

type DocumentDeps = {
  logger: LoggerPort;
  repo: InventoryDocumentRepositoryPort;
  productRepo: ProductRepositoryPort;
  locationRepo: LocationRepositoryPort;
  warehouseRepo: WarehouseRepositoryPort;
  moveRepo: StockMoveRepositoryPort;
  reservationRepo: StockReservationRepositoryPort;
  settingsRepo: InventorySettingsRepositoryPort;
  idGenerator: IdGeneratorPort;
  clock: ClockPort;
  idempotency: IdempotencyStoragePort;
  audit: AuditPort;
};

const buildLineItems = (params: {
  idGenerator: IdGeneratorPort;
  lineItems: Array<{
    id?: string;
    productId: string;
    quantity: number;
    unitCostCents?: number;
    fromLocationId?: string;
    toLocationId?: string;
    notes?: string;
  }>;
}): InventoryDocumentLine[] =>
  params.lineItems.map((item) => ({
    id: item.id ?? params.idGenerator.newId(),
    productId: item.productId,
    quantity: item.quantity,
    unitCostCents: item.unitCostCents ?? null,
    fromLocationId: item.fromLocationId ?? null,
    toLocationId: item.toLocationId ?? null,
    notes: item.notes ?? null,
    reservedQuantity: null,
  }));

const localDateFromIso = (value?: string | null) => (value ? parseLocalDate(value) : null);

const requireLocation = (value: string | null | undefined, label: string) => {
  if (!value) {
    throw new ValidationError(`${label} is required`, undefined, "LOCATION_REQUIRED");
  }
};

const ensureDefaultWarehouseId = async (params: {
  tenantId: string;
  settings: InventorySettingsAggregate | null;
  warehouseRepo: WarehouseRepositoryPort;
}): Promise<string | null> => {
  if (params.settings?.toProps().defaultWarehouseId) {
    return params.settings.toProps().defaultWarehouseId ?? null;
  }
  const defaultWarehouse = await params.warehouseRepo.findDefault(params.tenantId);
  return defaultWarehouse?.id ?? null;
};

const getDefaultLocation = async (params: {
  tenantId: string;
  warehouseId: string;
  locationRepo: LocationRepositoryPort;
  locationType: "INTERNAL" | "RECEIVING" | "SHIPPING";
}): Promise<string | null> => {
  const location = await params.locationRepo.findByWarehouseType(
    params.tenantId,
    params.warehouseId,
    params.locationType
  );
  return location?.id ?? null;
};

const validateLineLocations = async (params: {
  tenantId: string;
  documentType: InventoryDocumentType;
  lines: InventoryDocumentLine[];
  settings: InventorySettingsAggregate | null;
  warehouseRepo: WarehouseRepositoryPort;
  locationRepo: LocationRepositoryPort;
}): Promise<InventoryDocumentLine[]> => {
  const defaultWarehouseId = await ensureDefaultWarehouseId({
    tenantId: params.tenantId,
    settings: params.settings,
    warehouseRepo: params.warehouseRepo,
  });

  const resolvedLines: InventoryDocumentLine[] = [];

  for (const line of params.lines) {
    const updated = { ...line };

    if (params.documentType === "RECEIPT") {
      if (!updated.toLocationId && defaultWarehouseId) {
        updated.toLocationId = await getDefaultLocation({
          tenantId: params.tenantId,
          warehouseId: defaultWarehouseId,
          locationRepo: params.locationRepo,
          locationType: "RECEIVING",
        });
      }
      requireLocation(updated.toLocationId, "toLocationId");
    }

    if (params.documentType === "DELIVERY") {
      if (!updated.fromLocationId && defaultWarehouseId) {
        updated.fromLocationId = await getDefaultLocation({
          tenantId: params.tenantId,
          warehouseId: defaultWarehouseId,
          locationRepo: params.locationRepo,
          locationType: "INTERNAL",
        });
      }
      requireLocation(updated.fromLocationId, "fromLocationId");
    }

    if (params.documentType === "TRANSFER") {
      requireLocation(updated.fromLocationId, "fromLocationId");
      requireLocation(updated.toLocationId, "toLocationId");
      if (updated.fromLocationId === updated.toLocationId) {
        throw new ValidationError("fromLocationId and toLocationId must differ");
      }
    }

    if (params.documentType === "ADJUSTMENT") {
      if (!updated.fromLocationId && !updated.toLocationId) {
        throw new ValidationError(
          "Adjustment requires fromLocationId or toLocationId",
          undefined,
          "LOCATION_REQUIRED"
        );
      }
      if (updated.fromLocationId && updated.toLocationId) {
        throw new ValidationError("Adjustment cannot set both from and to locations");
      }
    }

    resolvedLines.push(updated);
  }

  return resolvedLines;
};

const validateProducts = async (params: {
  tenantId: string;
  productRepo: ProductRepositoryPort;
  lines: InventoryDocumentLine[];
}): Promise<void> => {
  for (const line of params.lines) {
    const product = await params.productRepo.findById(params.tenantId, line.productId);
    if (!product) {
      throw new NotFoundError("Product not found");
    }
    if (product.productType === "SERVICE") {
      throw new ValidationError(
        "Service products cannot be stocked",
        undefined,
        "PRODUCT_INACTIVE"
      );
    }
    if (!product.isActive) {
      throw new ValidationError(
        "Product is inactive",
        { productId: product.id },
        "PRODUCT_INACTIVE"
      );
    }
  }
};

const resolvePostingDate = (params: {
  postingDate?: string | null;
  documentPostingDate?: string | null;
}): string => {
  return params.postingDate || params.documentPostingDate || new Date().toISOString().slice(0, 10);
};

export class CreateInventoryDocumentUseCase extends BaseUseCase<
  CreateInventoryDocumentInput,
  CreateInventoryDocumentOutput
> {
  constructor(private readonly deps: DocumentDeps) {
    super({ logger: deps.logger });
  }

  protected async handle(
    input: CreateInventoryDocumentInput,
    ctx: UseCaseContext
  ): Promise<Result<CreateInventoryDocumentOutput, UseCaseError>> {
    if (!ctx.tenantId || !ctx.userId) {
      return err(new ValidationError("tenantId and userId are required"));
    }

    const cached = await getIdempotentResult<CreateInventoryDocumentOutput>({
      idempotency: this.deps.idempotency,
      actionKey: "inventory.create-document",
      tenantId: ctx.tenantId,
      idempotencyKey: input.idempotencyKey,
    });
    if (cached) {
      return ok(cached);
    }

    const settings = await this.deps.settingsRepo.findByTenant(ctx.tenantId);
    let lineItems = buildLineItems({
      idGenerator: this.deps.idGenerator,
      lineItems: input.lineItems,
    });

    await validateProducts({
      tenantId: ctx.tenantId,
      productRepo: this.deps.productRepo,
      lines: lineItems,
    });
    lineItems = await validateLineLocations({
      tenantId: ctx.tenantId,
      documentType: input.documentType,
      lines: lineItems,
      settings,
      warehouseRepo: this.deps.warehouseRepo,
      locationRepo: this.deps.locationRepo,
    });

    const now = this.deps.clock.now();
    const document = InventoryDocumentAggregate.createDraft({
      id: this.deps.idGenerator.newId(),
      tenantId: ctx.tenantId,
      documentType: input.documentType,
      reference: input.reference ?? null,
      scheduledDate: localDateFromIso(input.scheduledDate),
      postingDate: localDateFromIso(input.postingDate),
      notes: input.notes ?? null,
      partyId: input.partyId ?? null,
      sourceType: input.sourceType ?? null,
      sourceId: input.sourceId ?? null,
      lines: lineItems,
      now,
    });

    await this.deps.repo.create(ctx.tenantId, document);
    await this.deps.audit.log({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      action: "inventory.document.created",
      entityType: "InventoryDocument",
      entityId: document.id,
      metadata: { documentType: document.documentType },
    });

    const result = { document: toInventoryDocumentDto(document) };
    await storeIdempotentResult({
      idempotency: this.deps.idempotency,
      actionKey: "inventory.create-document",
      tenantId: ctx.tenantId,
      idempotencyKey: input.idempotencyKey,
      body: result,
    });

    return ok(result);
  }
}

export class UpdateInventoryDocumentUseCase extends BaseUseCase<
  UpdateInventoryDocumentInput,
  UpdateInventoryDocumentOutput
> {
  constructor(private readonly deps: DocumentDeps) {
    super({ logger: deps.logger });
  }

  protected async handle(
    input: UpdateInventoryDocumentInput,
    ctx: UseCaseContext
  ): Promise<Result<UpdateInventoryDocumentOutput, UseCaseError>> {
    if (!ctx.tenantId || !ctx.userId) {
      return err(new ValidationError("tenantId and userId are required"));
    }

    const document = await this.deps.repo.findById(ctx.tenantId, input.documentId);
    if (!document) {
      return err(new NotFoundError("Document not found"));
    }

    const now = this.deps.clock.now();
    if (input.headerPatch) {
      document.updateHeader(
        {
          partyId: input.headerPatch.partyId,
          reference: input.headerPatch.reference,
          scheduledDate: input.headerPatch.scheduledDate
            ? parseLocalDate(input.headerPatch.scheduledDate)
            : input.headerPatch.scheduledDate,
          postingDate: input.headerPatch.postingDate
            ? parseLocalDate(input.headerPatch.postingDate)
            : input.headerPatch.postingDate,
          notes: input.headerPatch.notes,
          sourceType: input.headerPatch.sourceType,
          sourceId: input.headerPatch.sourceId,
        },
        now
      );
    }

    if (input.lineItems) {
      let lineItems = buildLineItems({
        idGenerator: this.deps.idGenerator,
        lineItems: input.lineItems,
      });
      await validateProducts({
        tenantId: ctx.tenantId,
        productRepo: this.deps.productRepo,
        lines: lineItems,
      });
      const settings = await this.deps.settingsRepo.findByTenant(ctx.tenantId);
      lineItems = await validateLineLocations({
        tenantId: ctx.tenantId,
        documentType: document.documentType,
        lines: lineItems,
        settings,
        warehouseRepo: this.deps.warehouseRepo,
        locationRepo: this.deps.locationRepo,
      });
      document.replaceLineItems(lineItems, now);
    }

    await this.deps.repo.save(ctx.tenantId, document);
    await this.deps.audit.log({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      action: "inventory.document.updated",
      entityType: "InventoryDocument",
      entityId: document.id,
    });

    return ok({ document: toInventoryDocumentDto(document) });
  }
}

export class ConfirmInventoryDocumentUseCase extends BaseUseCase<
  ConfirmInventoryDocumentInput,
  ConfirmInventoryDocumentOutput
> {
  constructor(private readonly deps: DocumentDeps) {
    super({ logger: deps.logger });
  }

  protected async handle(
    input: ConfirmInventoryDocumentInput,
    ctx: UseCaseContext
  ): Promise<Result<ConfirmInventoryDocumentOutput, UseCaseError>> {
    if (!ctx.tenantId || !ctx.userId) {
      return err(new ValidationError("tenantId and userId are required"));
    }

    const cached = await getIdempotentResult<ConfirmInventoryDocumentOutput>({
      idempotency: this.deps.idempotency,
      actionKey: "inventory.confirm-document",
      tenantId: ctx.tenantId,
      idempotencyKey: input.idempotencyKey,
    });
    if (cached) {
      return ok(cached);
    }

    const document = await this.deps.repo.findById(ctx.tenantId, input.documentId);
    if (!document) {
      return err(new NotFoundError("Document not found"));
    }

    let settings = await this.deps.settingsRepo.findByTenant(ctx.tenantId);
    if (!settings) {
      settings = InventorySettingsAggregate.createDefault({
        id: this.deps.idGenerator.newId(),
        tenantId: ctx.tenantId,
        now: this.deps.clock.now(),
      });
    }

    const documentNumber = await allocateUniqueNumber({
      next: () => settings!.allocateDocumentNumber(document.documentType),
      isTaken: (candidate) => this.deps.repo.isDocumentNumberTaken(ctx.tenantId!, candidate),
    });

    const now = this.deps.clock.now();
    try {
      document.confirm(documentNumber, now, now);
    } catch (error) {
      return err(new ValidationError((error as Error).message));
    }

    if (document.documentType === "DELIVERY") {
      const shortages: Array<{
        lineId: string;
        productId: string;
        locationId: string;
        requested: number;
        available: number;
      }> = [];

      const productIds = document.lines.map((line) => line.productId);
      const locationIds = document.lines.map((line) => line.fromLocationId!).filter(Boolean);

      const onHand = await this.deps.moveRepo.sumByProductLocation(ctx.tenantId, {
        productIds,
        locationIds,
      });
      const reserved = await this.deps.reservationRepo.sumActiveByProductLocation(ctx.tenantId, {
        productIds,
        locationIds,
      });

      const key = (productId: string, locationId: string) => `${productId}:${locationId}`;
      const onHandMap = new Map<string, number>();
      const reservedMap = new Map<string, number>();

      onHand.forEach((row) => {
        onHandMap.set(key(row.productId, row.locationId), row.quantityDelta);
      });
      reserved.forEach((row) => {
        reservedMap.set(key(row.productId, row.locationId), row.reservedQty);
      });

      document.lines = document.lines.map((line) => {
        const locationId = line.fromLocationId!;
        const availableQty =
          (onHandMap.get(key(line.productId, locationId)) ?? 0) -
          (reservedMap.get(key(line.productId, locationId)) ?? 0);

        if (availableQty < line.quantity) {
          shortages.push({
            lineId: line.id,
            productId: line.productId,
            locationId,
            requested: line.quantity,
            available: availableQty,
          });
        }

        return { ...line, reservedQuantity: line.quantity };
      });

      if (shortages.length) {
        return err(
          new ValidationError("Insufficient stock to reserve", { shortages }, "RESERVATION_FAILED")
        );
      }

      const reservations = document.lines.map((line) => ({
        id: this.deps.idGenerator.newId(),
        tenantId: ctx.tenantId!,
        productId: line.productId,
        locationId: line.fromLocationId!,
        documentId: document.id,
        reservedQty: line.quantity,
        status: "ACTIVE" as const,
        createdAt: now,
        releasedAt: null,
        fulfilledAt: null,
        createdByUserId: ctx.userId!,
      }));

      await this.deps.reservationRepo.createMany(ctx.tenantId, reservations);
    }

    await this.deps.repo.save(ctx.tenantId, document);
    await this.deps.settingsRepo.save(settings);

    await this.deps.audit.log({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      action: "inventory.document.confirmed",
      entityType: "InventoryDocument",
      entityId: document.id,
      metadata: { documentType: document.documentType, documentNumber },
    });

    const result = { document: toInventoryDocumentDto(document) };
    await storeIdempotentResult({
      idempotency: this.deps.idempotency,
      actionKey: "inventory.confirm-document",
      tenantId: ctx.tenantId,
      idempotencyKey: input.idempotencyKey,
      body: result,
    });

    return ok(result);
  }
}

export class PostInventoryDocumentUseCase extends BaseUseCase<
  PostInventoryDocumentInput,
  PostInventoryDocumentOutput
> {
  constructor(private readonly deps: DocumentDeps) {
    super({ logger: deps.logger });
  }

  protected async handle(
    input: PostInventoryDocumentInput,
    ctx: UseCaseContext
  ): Promise<Result<PostInventoryDocumentOutput, UseCaseError>> {
    if (!ctx.tenantId || !ctx.userId) {
      return err(new ValidationError("tenantId and userId are required"));
    }

    const cached = await getIdempotentResult<PostInventoryDocumentOutput>({
      idempotency: this.deps.idempotency,
      actionKey: "inventory.post-document",
      tenantId: ctx.tenantId,
      idempotencyKey: input.idempotencyKey,
    });
    if (cached) {
      return ok(cached);
    }

    const document = await this.deps.repo.findById(ctx.tenantId, input.documentId);
    if (!document) {
      return err(new NotFoundError("Document not found"));
    }

    let settings = await this.deps.settingsRepo.findByTenant(ctx.tenantId);
    if (!settings) {
      settings = InventorySettingsAggregate.createDefault({
        id: this.deps.idGenerator.newId(),
        tenantId: ctx.tenantId,
        now: this.deps.clock.now(),
      });
    }

    const postingDate = resolvePostingDate({
      postingDate: input.postingDate,
      documentPostingDate: document.postingDate ?? null,
    });

    const postingLocalDate = parseLocalDate(postingDate);
    const moves: StockMove[] = [];

    if (
      (document.documentType === "DELIVERY" || document.documentType === "TRANSFER") &&
      settings.toProps().negativeStockPolicy === "DISALLOW"
    ) {
      const productIds = document.lines.map((line) => line.productId);
      const locationIds = document.lines
        .map((line) => line.fromLocationId)
        .filter((value): value is string => Boolean(value));

      const onHand = await this.deps.moveRepo.sumByProductLocation(ctx.tenantId, {
        productIds,
        locationIds,
      });
      const onHandMap = new Map<string, number>();
      const key = (productId: string, locationId: string) => `${productId}:${locationId}`;
      onHand.forEach((row) => {
        onHandMap.set(key(row.productId, row.locationId), row.quantityDelta);
      });

      const shortages: Array<{
        lineId: string;
        productId: string;
        locationId: string;
        requested: number;
        available: number;
      }> = [];

      for (const line of document.lines) {
        const fromLocationId = line.fromLocationId;
        if (!fromLocationId) {
          return err(
            new ValidationError("fromLocationId is required", undefined, "LOCATION_REQUIRED")
          );
        }
        const available = onHandMap.get(key(line.productId, fromLocationId)) ?? 0;
        if (available - line.quantity < 0) {
          shortages.push({
            lineId: line.id,
            productId: line.productId,
            locationId: fromLocationId,
            requested: line.quantity,
            available,
          });
        }
      }

      if (shortages.length) {
        return err(
          new ValidationError(
            "Negative stock not allowed",
            { shortages },
            "NEGATIVE_STOCK_NOT_ALLOWED"
          )
        );
      }
    }

    for (const line of document.lines) {
      if (document.documentType === "RECEIPT") {
        requireLocation(line.toLocationId, "toLocationId");
        moves.push({
          id: this.deps.idGenerator.newId(),
          tenantId: ctx.tenantId,
          postingDate: postingLocalDate,
          productId: line.productId,
          quantityDelta: line.quantity,
          locationId: line.toLocationId!,
          documentType: document.documentType,
          documentId: document.id,
          lineId: line.id,
          reasonCode: "RECEIPT",
          createdAt: this.deps.clock.now(),
          createdByUserId: ctx.userId,
        });
      }

      if (document.documentType === "DELIVERY") {
        requireLocation(line.fromLocationId, "fromLocationId");
        moves.push({
          id: this.deps.idGenerator.newId(),
          tenantId: ctx.tenantId,
          postingDate: postingLocalDate,
          productId: line.productId,
          quantityDelta: -line.quantity,
          locationId: line.fromLocationId!,
          documentType: document.documentType,
          documentId: document.id,
          lineId: line.id,
          reasonCode: "SHIPMENT",
          createdAt: this.deps.clock.now(),
          createdByUserId: ctx.userId,
        });
      }

      if (document.documentType === "TRANSFER") {
        requireLocation(line.fromLocationId, "fromLocationId");
        requireLocation(line.toLocationId, "toLocationId");
        moves.push({
          id: this.deps.idGenerator.newId(),
          tenantId: ctx.tenantId,
          postingDate: postingLocalDate,
          productId: line.productId,
          quantityDelta: -line.quantity,
          locationId: line.fromLocationId!,
          documentType: document.documentType,
          documentId: document.id,
          lineId: line.id,
          reasonCode: "TRANSFER",
          createdAt: this.deps.clock.now(),
          createdByUserId: ctx.userId,
        });
        moves.push({
          id: this.deps.idGenerator.newId(),
          tenantId: ctx.tenantId,
          postingDate: postingLocalDate,
          productId: line.productId,
          quantityDelta: line.quantity,
          locationId: line.toLocationId!,
          documentType: document.documentType,
          documentId: document.id,
          lineId: line.id,
          reasonCode: "TRANSFER",
          createdAt: this.deps.clock.now(),
          createdByUserId: ctx.userId,
        });
      }

      if (document.documentType === "ADJUSTMENT") {
        if (line.toLocationId) {
          moves.push({
            id: this.deps.idGenerator.newId(),
            tenantId: ctx.tenantId,
            postingDate: postingLocalDate,
            productId: line.productId,
            quantityDelta: line.quantity,
            locationId: line.toLocationId,
            documentType: document.documentType,
            documentId: document.id,
            lineId: line.id,
            reasonCode: "ADJUSTMENT",
            createdAt: this.deps.clock.now(),
            createdByUserId: ctx.userId,
          });
        } else if (line.fromLocationId) {
          moves.push({
            id: this.deps.idGenerator.newId(),
            tenantId: ctx.tenantId,
            postingDate: postingLocalDate,
            productId: line.productId,
            quantityDelta: -line.quantity,
            locationId: line.fromLocationId,
            documentType: document.documentType,
            documentId: document.id,
            lineId: line.id,
            reasonCode: "ADJUSTMENT",
            createdAt: this.deps.clock.now(),
            createdByUserId: ctx.userId,
          });
        }
      }
    }

    const now = this.deps.clock.now();
    document.setPostingDate(postingLocalDate, now);
    try {
      document.post(now, now);
    } catch (error) {
      return err(new ValidationError((error as Error).message));
    }

    await this.deps.moveRepo.createMany(ctx.tenantId, moves);

    if (document.documentType === "DELIVERY") {
      await this.deps.reservationRepo.fulfillByDocument(ctx.tenantId, document.id, now);
    }

    await this.deps.repo.save(ctx.tenantId, document);
    await this.deps.settingsRepo.save(settings);

    await this.deps.audit.log({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      action: "inventory.document.posted",
      entityType: "InventoryDocument",
      entityId: document.id,
      metadata: { documentType: document.documentType },
    });

    const result = { document: toInventoryDocumentDto(document) };
    await storeIdempotentResult({
      idempotency: this.deps.idempotency,
      actionKey: "inventory.post-document",
      tenantId: ctx.tenantId,
      idempotencyKey: input.idempotencyKey,
      body: result,
    });

    return ok(result);
  }
}

export class CancelInventoryDocumentUseCase extends BaseUseCase<
  CancelInventoryDocumentInput,
  CancelInventoryDocumentOutput
> {
  constructor(private readonly deps: DocumentDeps) {
    super({ logger: deps.logger });
  }

  protected async handle(
    input: CancelInventoryDocumentInput,
    ctx: UseCaseContext
  ): Promise<Result<CancelInventoryDocumentOutput, UseCaseError>> {
    if (!ctx.tenantId || !ctx.userId) {
      return err(new ValidationError("tenantId and userId are required"));
    }

    const cached = await getIdempotentResult<CancelInventoryDocumentOutput>({
      idempotency: this.deps.idempotency,
      actionKey: "inventory.cancel-document",
      tenantId: ctx.tenantId,
      idempotencyKey: input.idempotencyKey,
    });
    if (cached) {
      return ok(cached);
    }

    const document = await this.deps.repo.findById(ctx.tenantId, input.documentId);
    if (!document) {
      return err(new NotFoundError("Document not found"));
    }

    const now = this.deps.clock.now();
    try {
      document.cancel(now, now);
    } catch (error) {
      return err(new ValidationError((error as Error).message));
    }

    if (document.documentType === "DELIVERY") {
      await this.deps.reservationRepo.releaseByDocument(ctx.tenantId, document.id, now);
    }

    await this.deps.repo.save(ctx.tenantId, document);
    await this.deps.audit.log({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      action: "inventory.document.canceled",
      entityType: "InventoryDocument",
      entityId: document.id,
      metadata: { documentType: document.documentType },
    });

    const result = { document: toInventoryDocumentDto(document) };
    await storeIdempotentResult({
      idempotency: this.deps.idempotency,
      actionKey: "inventory.cancel-document",
      tenantId: ctx.tenantId,
      idempotencyKey: input.idempotencyKey,
      body: result,
    });

    return ok(result);
  }
}

export class GetInventoryDocumentUseCase extends BaseUseCase<
  GetInventoryDocumentInput,
  GetInventoryDocumentOutput
> {
  constructor(private readonly deps: DocumentDeps) {
    super({ logger: deps.logger });
  }

  protected async handle(
    input: GetInventoryDocumentInput,
    ctx: UseCaseContext
  ): Promise<Result<GetInventoryDocumentOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId missing from context"));
    }

    const document = await this.deps.repo.findById(ctx.tenantId, input.documentId);
    if (!document) {
      return err(new NotFoundError("Document not found"));
    }

    return ok({ document: toInventoryDocumentDto(document) });
  }
}

export class ListInventoryDocumentsUseCase extends BaseUseCase<
  ListInventoryDocumentsInput,
  ListInventoryDocumentsOutput
> {
  constructor(private readonly deps: DocumentDeps) {
    super({ logger: deps.logger });
  }

  protected async handle(
    input: ListInventoryDocumentsInput,
    ctx: UseCaseContext
  ): Promise<Result<ListInventoryDocumentsOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId missing from context"));
    }

    const result = await this.deps.repo.list(ctx.tenantId, {
      type: input.type,
      status: input.status,
      partyId: input.partyId,
      fromDate: input.fromDate,
      toDate: input.toDate,
      search: input.search,
      cursor: input.cursor,
      pageSize: input.pageSize,
    });

    return ok({
      items: result.items.map(toInventoryDocumentDto),
      nextCursor: result.nextCursor ?? null,
    });
  }
}
