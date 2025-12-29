import { Module } from "@nestjs/common";
import { DataModule, PrismaAuditAdapter } from "@kerniflow/data";
import { InventoryController } from "./adapters/http/inventory.controller";
import { InventoryApplication } from "./application/inventory.application";
import { NestLoggerAdapter } from "../../shared/adapters/logger/nest-logger.adapter";
import { SystemClock } from "../../shared/infrastructure/system-clock";
import { SystemIdGenerator } from "../../shared/infrastructure/system-id-generator";
import { CLOCK_PORT_TOKEN } from "../../shared/ports/clock.port";
import { ID_GENERATOR_TOKEN } from "../../shared/ports/id-generator.port";
import {
  IdempotencyStoragePort,
  IDEMPOTENCY_STORAGE_PORT_TOKEN,
} from "../../shared/ports/idempotency-storage.port";
import { PrismaIdempotencyStorageAdapter } from "../../shared/infrastructure/persistence/prisma-idempotency-storage.adapter";
import { AUDIT_PORT, AuditPort } from "@kerniflow/kernel";
import { IdentityModule } from "../identity";

import { PrismaProductRepository } from "./infrastructure/adapters/prisma-product-repository.adapter";
import { PrismaWarehouseRepository } from "./infrastructure/adapters/prisma-warehouse-repository.adapter";
import { PrismaLocationRepository } from "./infrastructure/adapters/prisma-location-repository.adapter";
import { PrismaInventoryDocumentRepository } from "./infrastructure/adapters/prisma-document-repository.adapter";
import { PrismaStockMoveRepository } from "./infrastructure/adapters/prisma-stock-move-repository.adapter";
import { PrismaStockReservationRepository } from "./infrastructure/adapters/prisma-stock-reservation-repository.adapter";
import { PrismaReorderPolicyRepository } from "./infrastructure/adapters/prisma-reorder-policy-repository.adapter";
import { PrismaInventorySettingsRepository } from "./infrastructure/adapters/prisma-settings-repository.adapter";

import { PRODUCT_REPO } from "./application/ports/product-repository.port";
import { WAREHOUSE_REPO } from "./application/ports/warehouse-repository.port";
import { LOCATION_REPO } from "./application/ports/location-repository.port";
import { DOCUMENT_REPO } from "./application/ports/document-repository.port";
import { STOCK_MOVE_REPO } from "./application/ports/stock-move-repository.port";
import { STOCK_RESERVATION_REPO } from "./application/ports/stock-reservation-repository.port";
import { REORDER_POLICY_REPO } from "./application/ports/reorder-policy-repository.port";
import { INVENTORY_SETTINGS_REPO } from "./application/ports/settings-repository.port";

import {
  CreateProductUseCase,
  UpdateProductUseCase,
  ActivateProductUseCase,
  DeactivateProductUseCase,
  GetProductUseCase,
  ListProductsUseCase,
} from "./application/use-cases/products.usecases";
import {
  CreateWarehouseUseCase,
  UpdateWarehouseUseCase,
  GetWarehouseUseCase,
  ListWarehousesUseCase,
} from "./application/use-cases/warehouses.usecases";
import {
  CreateLocationUseCase,
  UpdateLocationUseCase,
  ListLocationsUseCase,
} from "./application/use-cases/locations.usecases";
import {
  CreateInventoryDocumentUseCase,
  UpdateInventoryDocumentUseCase,
  ConfirmInventoryDocumentUseCase,
  PostInventoryDocumentUseCase,
  CancelInventoryDocumentUseCase,
  GetInventoryDocumentUseCase,
  ListInventoryDocumentsUseCase,
} from "./application/use-cases/documents.usecases";
import {
  GetOnHandUseCase,
  GetAvailableUseCase,
  ListStockMovesUseCase,
  ListReservationsUseCase,
} from "./application/use-cases/stock.usecases";
import {
  ListReorderPoliciesUseCase,
  CreateReorderPolicyUseCase,
  UpdateReorderPolicyUseCase,
  GetReorderSuggestionsUseCase,
  GetLowStockUseCase,
} from "./application/use-cases/reorder.usecases";

@Module({
  imports: [DataModule, IdentityModule],
  controllers: [InventoryController],
  providers: [
    PrismaProductRepository,
    PrismaWarehouseRepository,
    PrismaLocationRepository,
    PrismaInventoryDocumentRepository,
    PrismaStockMoveRepository,
    PrismaStockReservationRepository,
    PrismaReorderPolicyRepository,
    PrismaInventorySettingsRepository,
    PrismaAuditAdapter,
    PrismaIdempotencyStorageAdapter,
    SystemIdGenerator,
    SystemClock,
    { provide: PRODUCT_REPO, useExisting: PrismaProductRepository },
    { provide: WAREHOUSE_REPO, useExisting: PrismaWarehouseRepository },
    { provide: LOCATION_REPO, useExisting: PrismaLocationRepository },
    { provide: DOCUMENT_REPO, useExisting: PrismaInventoryDocumentRepository },
    { provide: STOCK_MOVE_REPO, useExisting: PrismaStockMoveRepository },
    { provide: STOCK_RESERVATION_REPO, useExisting: PrismaStockReservationRepository },
    { provide: REORDER_POLICY_REPO, useExisting: PrismaReorderPolicyRepository },
    { provide: INVENTORY_SETTINGS_REPO, useExisting: PrismaInventorySettingsRepository },
    { provide: AUDIT_PORT, useExisting: PrismaAuditAdapter },
    { provide: IDEMPOTENCY_STORAGE_PORT_TOKEN, useExisting: PrismaIdempotencyStorageAdapter },
    { provide: ID_GENERATOR_TOKEN, useExisting: SystemIdGenerator },
    { provide: CLOCK_PORT_TOKEN, useExisting: SystemClock },
    {
      provide: CreateProductUseCase,
      useFactory: (
        repo: PrismaProductRepository,
        idempotency: IdempotencyStoragePort,
        idGen: SystemIdGenerator,
        clock: SystemClock,
        audit: AuditPort
      ) =>
        new CreateProductUseCase({
          logger: new NestLoggerAdapter(),
          repo,
          idempotency,
          idGenerator: idGen,
          clock,
          audit,
        }),
      inject: [
        PRODUCT_REPO,
        IDEMPOTENCY_STORAGE_PORT_TOKEN,
        ID_GENERATOR_TOKEN,
        CLOCK_PORT_TOKEN,
        AUDIT_PORT,
      ],
    },
    {
      provide: UpdateProductUseCase,
      useFactory: (
        repo: PrismaProductRepository,
        idempotency: IdempotencyStoragePort,
        idGen: SystemIdGenerator,
        clock: SystemClock,
        audit: AuditPort
      ) =>
        new UpdateProductUseCase({
          logger: new NestLoggerAdapter(),
          repo,
          idempotency,
          idGenerator: idGen,
          clock,
          audit,
        }),
      inject: [
        PRODUCT_REPO,
        IDEMPOTENCY_STORAGE_PORT_TOKEN,
        ID_GENERATOR_TOKEN,
        CLOCK_PORT_TOKEN,
        AUDIT_PORT,
      ],
    },
    {
      provide: ActivateProductUseCase,
      useFactory: (
        repo: PrismaProductRepository,
        idempotency: IdempotencyStoragePort,
        idGen: SystemIdGenerator,
        clock: SystemClock,
        audit: AuditPort
      ) =>
        new ActivateProductUseCase({
          logger: new NestLoggerAdapter(),
          repo,
          idempotency,
          idGenerator: idGen,
          clock,
          audit,
        }),
      inject: [
        PRODUCT_REPO,
        IDEMPOTENCY_STORAGE_PORT_TOKEN,
        ID_GENERATOR_TOKEN,
        CLOCK_PORT_TOKEN,
        AUDIT_PORT,
      ],
    },
    {
      provide: DeactivateProductUseCase,
      useFactory: (
        repo: PrismaProductRepository,
        idempotency: IdempotencyStoragePort,
        idGen: SystemIdGenerator,
        clock: SystemClock,
        audit: AuditPort
      ) =>
        new DeactivateProductUseCase({
          logger: new NestLoggerAdapter(),
          repo,
          idempotency,
          idGenerator: idGen,
          clock,
          audit,
        }),
      inject: [
        PRODUCT_REPO,
        IDEMPOTENCY_STORAGE_PORT_TOKEN,
        ID_GENERATOR_TOKEN,
        CLOCK_PORT_TOKEN,
        AUDIT_PORT,
      ],
    },
    {
      provide: GetProductUseCase,
      useFactory: (
        repo: PrismaProductRepository,
        idempotency: IdempotencyStoragePort,
        idGen: SystemIdGenerator,
        clock: SystemClock,
        audit: AuditPort
      ) =>
        new GetProductUseCase({
          logger: new NestLoggerAdapter(),
          repo,
          idempotency,
          idGenerator: idGen,
          clock,
          audit,
        }),
      inject: [
        PRODUCT_REPO,
        IDEMPOTENCY_STORAGE_PORT_TOKEN,
        ID_GENERATOR_TOKEN,
        CLOCK_PORT_TOKEN,
        AUDIT_PORT,
      ],
    },
    {
      provide: ListProductsUseCase,
      useFactory: (
        repo: PrismaProductRepository,
        idempotency: IdempotencyStoragePort,
        idGen: SystemIdGenerator,
        clock: SystemClock,
        audit: AuditPort
      ) =>
        new ListProductsUseCase({
          logger: new NestLoggerAdapter(),
          repo,
          idempotency,
          idGenerator: idGen,
          clock,
          audit,
        }),
      inject: [
        PRODUCT_REPO,
        IDEMPOTENCY_STORAGE_PORT_TOKEN,
        ID_GENERATOR_TOKEN,
        CLOCK_PORT_TOKEN,
        AUDIT_PORT,
      ],
    },
    {
      provide: CreateWarehouseUseCase,
      useFactory: (
        repo: PrismaWarehouseRepository,
        locationRepo: PrismaLocationRepository,
        idempotency: IdempotencyStoragePort,
        idGen: SystemIdGenerator,
        clock: SystemClock,
        audit: AuditPort
      ) =>
        new CreateWarehouseUseCase({
          logger: new NestLoggerAdapter(),
          repo,
          locationRepo,
          idempotency,
          idGenerator: idGen,
          clock,
          audit,
        }),
      inject: [
        WAREHOUSE_REPO,
        LOCATION_REPO,
        IDEMPOTENCY_STORAGE_PORT_TOKEN,
        ID_GENERATOR_TOKEN,
        CLOCK_PORT_TOKEN,
        AUDIT_PORT,
      ],
    },
    {
      provide: UpdateWarehouseUseCase,
      useFactory: (
        repo: PrismaWarehouseRepository,
        locationRepo: PrismaLocationRepository,
        idempotency: IdempotencyStoragePort,
        idGen: SystemIdGenerator,
        clock: SystemClock,
        audit: AuditPort
      ) =>
        new UpdateWarehouseUseCase({
          logger: new NestLoggerAdapter(),
          repo,
          locationRepo,
          idempotency,
          idGenerator: idGen,
          clock,
          audit,
        }),
      inject: [
        WAREHOUSE_REPO,
        LOCATION_REPO,
        IDEMPOTENCY_STORAGE_PORT_TOKEN,
        ID_GENERATOR_TOKEN,
        CLOCK_PORT_TOKEN,
        AUDIT_PORT,
      ],
    },
    {
      provide: GetWarehouseUseCase,
      useFactory: (
        repo: PrismaWarehouseRepository,
        locationRepo: PrismaLocationRepository,
        idempotency: IdempotencyStoragePort,
        idGen: SystemIdGenerator,
        clock: SystemClock,
        audit: AuditPort
      ) =>
        new GetWarehouseUseCase({
          logger: new NestLoggerAdapter(),
          repo,
          locationRepo,
          idempotency,
          idGenerator: idGen,
          clock,
          audit,
        }),
      inject: [
        WAREHOUSE_REPO,
        LOCATION_REPO,
        IDEMPOTENCY_STORAGE_PORT_TOKEN,
        ID_GENERATOR_TOKEN,
        CLOCK_PORT_TOKEN,
        AUDIT_PORT,
      ],
    },
    {
      provide: ListWarehousesUseCase,
      useFactory: (
        repo: PrismaWarehouseRepository,
        locationRepo: PrismaLocationRepository,
        idempotency: IdempotencyStoragePort,
        idGen: SystemIdGenerator,
        clock: SystemClock,
        audit: AuditPort
      ) =>
        new ListWarehousesUseCase({
          logger: new NestLoggerAdapter(),
          repo,
          locationRepo,
          idempotency,
          idGenerator: idGen,
          clock,
          audit,
        }),
      inject: [
        WAREHOUSE_REPO,
        LOCATION_REPO,
        IDEMPOTENCY_STORAGE_PORT_TOKEN,
        ID_GENERATOR_TOKEN,
        CLOCK_PORT_TOKEN,
        AUDIT_PORT,
      ],
    },
    {
      provide: CreateLocationUseCase,
      useFactory: (
        repo: PrismaLocationRepository,
        warehouseRepo: PrismaWarehouseRepository,
        idempotency: IdempotencyStoragePort,
        idGen: SystemIdGenerator,
        clock: SystemClock,
        audit: AuditPort
      ) =>
        new CreateLocationUseCase({
          logger: new NestLoggerAdapter(),
          repo,
          warehouseRepo,
          idempotency,
          idGenerator: idGen,
          clock,
          audit,
        }),
      inject: [
        LOCATION_REPO,
        WAREHOUSE_REPO,
        IDEMPOTENCY_STORAGE_PORT_TOKEN,
        ID_GENERATOR_TOKEN,
        CLOCK_PORT_TOKEN,
        AUDIT_PORT,
      ],
    },
    {
      provide: UpdateLocationUseCase,
      useFactory: (
        repo: PrismaLocationRepository,
        warehouseRepo: PrismaWarehouseRepository,
        idempotency: IdempotencyStoragePort,
        idGen: SystemIdGenerator,
        clock: SystemClock,
        audit: AuditPort
      ) =>
        new UpdateLocationUseCase({
          logger: new NestLoggerAdapter(),
          repo,
          warehouseRepo,
          idempotency,
          idGenerator: idGen,
          clock,
          audit,
        }),
      inject: [
        LOCATION_REPO,
        WAREHOUSE_REPO,
        IDEMPOTENCY_STORAGE_PORT_TOKEN,
        ID_GENERATOR_TOKEN,
        CLOCK_PORT_TOKEN,
        AUDIT_PORT,
      ],
    },
    {
      provide: ListLocationsUseCase,
      useFactory: (
        repo: PrismaLocationRepository,
        warehouseRepo: PrismaWarehouseRepository,
        idempotency: IdempotencyStoragePort,
        idGen: SystemIdGenerator,
        clock: SystemClock,
        audit: AuditPort
      ) =>
        new ListLocationsUseCase({
          logger: new NestLoggerAdapter(),
          repo,
          warehouseRepo,
          idempotency,
          idGenerator: idGen,
          clock,
          audit,
        }),
      inject: [
        LOCATION_REPO,
        WAREHOUSE_REPO,
        IDEMPOTENCY_STORAGE_PORT_TOKEN,
        ID_GENERATOR_TOKEN,
        CLOCK_PORT_TOKEN,
        AUDIT_PORT,
      ],
    },
    {
      provide: CreateInventoryDocumentUseCase,
      useFactory: (
        repo: PrismaInventoryDocumentRepository,
        productRepo: PrismaProductRepository,
        locationRepo: PrismaLocationRepository,
        warehouseRepo: PrismaWarehouseRepository,
        moveRepo: PrismaStockMoveRepository,
        reservationRepo: PrismaStockReservationRepository,
        settingsRepo: PrismaInventorySettingsRepository,
        idempotency: IdempotencyStoragePort,
        idGen: SystemIdGenerator,
        clock: SystemClock,
        audit: AuditPort
      ) =>
        new CreateInventoryDocumentUseCase({
          logger: new NestLoggerAdapter(),
          repo,
          productRepo,
          locationRepo,
          warehouseRepo,
          moveRepo,
          reservationRepo,
          settingsRepo,
          idempotency,
          idGenerator: idGen,
          clock,
          audit,
        }),
      inject: [
        DOCUMENT_REPO,
        PRODUCT_REPO,
        LOCATION_REPO,
        WAREHOUSE_REPO,
        STOCK_MOVE_REPO,
        STOCK_RESERVATION_REPO,
        INVENTORY_SETTINGS_REPO,
        IDEMPOTENCY_STORAGE_PORT_TOKEN,
        ID_GENERATOR_TOKEN,
        CLOCK_PORT_TOKEN,
        AUDIT_PORT,
      ],
    },
    {
      provide: UpdateInventoryDocumentUseCase,
      useFactory: (
        repo: PrismaInventoryDocumentRepository,
        productRepo: PrismaProductRepository,
        locationRepo: PrismaLocationRepository,
        warehouseRepo: PrismaWarehouseRepository,
        moveRepo: PrismaStockMoveRepository,
        reservationRepo: PrismaStockReservationRepository,
        settingsRepo: PrismaInventorySettingsRepository,
        idempotency: IdempotencyStoragePort,
        idGen: SystemIdGenerator,
        clock: SystemClock,
        audit: AuditPort
      ) =>
        new UpdateInventoryDocumentUseCase({
          logger: new NestLoggerAdapter(),
          repo,
          productRepo,
          locationRepo,
          warehouseRepo,
          moveRepo,
          reservationRepo,
          settingsRepo,
          idempotency,
          idGenerator: idGen,
          clock,
          audit,
        }),
      inject: [
        DOCUMENT_REPO,
        PRODUCT_REPO,
        LOCATION_REPO,
        WAREHOUSE_REPO,
        STOCK_MOVE_REPO,
        STOCK_RESERVATION_REPO,
        INVENTORY_SETTINGS_REPO,
        IDEMPOTENCY_STORAGE_PORT_TOKEN,
        ID_GENERATOR_TOKEN,
        CLOCK_PORT_TOKEN,
        AUDIT_PORT,
      ],
    },
    {
      provide: ConfirmInventoryDocumentUseCase,
      useFactory: (
        repo: PrismaInventoryDocumentRepository,
        productRepo: PrismaProductRepository,
        locationRepo: PrismaLocationRepository,
        warehouseRepo: PrismaWarehouseRepository,
        moveRepo: PrismaStockMoveRepository,
        reservationRepo: PrismaStockReservationRepository,
        settingsRepo: PrismaInventorySettingsRepository,
        idempotency: IdempotencyStoragePort,
        idGen: SystemIdGenerator,
        clock: SystemClock,
        audit: AuditPort
      ) =>
        new ConfirmInventoryDocumentUseCase({
          logger: new NestLoggerAdapter(),
          repo,
          productRepo,
          locationRepo,
          warehouseRepo,
          moveRepo,
          reservationRepo,
          settingsRepo,
          idempotency,
          idGenerator: idGen,
          clock,
          audit,
        }),
      inject: [
        DOCUMENT_REPO,
        PRODUCT_REPO,
        LOCATION_REPO,
        WAREHOUSE_REPO,
        STOCK_MOVE_REPO,
        STOCK_RESERVATION_REPO,
        INVENTORY_SETTINGS_REPO,
        IDEMPOTENCY_STORAGE_PORT_TOKEN,
        ID_GENERATOR_TOKEN,
        CLOCK_PORT_TOKEN,
        AUDIT_PORT,
      ],
    },
    {
      provide: PostInventoryDocumentUseCase,
      useFactory: (
        repo: PrismaInventoryDocumentRepository,
        productRepo: PrismaProductRepository,
        locationRepo: PrismaLocationRepository,
        warehouseRepo: PrismaWarehouseRepository,
        moveRepo: PrismaStockMoveRepository,
        reservationRepo: PrismaStockReservationRepository,
        settingsRepo: PrismaInventorySettingsRepository,
        idempotency: IdempotencyStoragePort,
        idGen: SystemIdGenerator,
        clock: SystemClock,
        audit: AuditPort
      ) =>
        new PostInventoryDocumentUseCase({
          logger: new NestLoggerAdapter(),
          repo,
          productRepo,
          locationRepo,
          warehouseRepo,
          moveRepo,
          reservationRepo,
          settingsRepo,
          idempotency,
          idGenerator: idGen,
          clock,
          audit,
        }),
      inject: [
        DOCUMENT_REPO,
        PRODUCT_REPO,
        LOCATION_REPO,
        WAREHOUSE_REPO,
        STOCK_MOVE_REPO,
        STOCK_RESERVATION_REPO,
        INVENTORY_SETTINGS_REPO,
        IDEMPOTENCY_STORAGE_PORT_TOKEN,
        ID_GENERATOR_TOKEN,
        CLOCK_PORT_TOKEN,
        AUDIT_PORT,
      ],
    },
    {
      provide: CancelInventoryDocumentUseCase,
      useFactory: (
        repo: PrismaInventoryDocumentRepository,
        productRepo: PrismaProductRepository,
        locationRepo: PrismaLocationRepository,
        warehouseRepo: PrismaWarehouseRepository,
        moveRepo: PrismaStockMoveRepository,
        reservationRepo: PrismaStockReservationRepository,
        settingsRepo: PrismaInventorySettingsRepository,
        idempotency: IdempotencyStoragePort,
        idGen: SystemIdGenerator,
        clock: SystemClock,
        audit: AuditPort
      ) =>
        new CancelInventoryDocumentUseCase({
          logger: new NestLoggerAdapter(),
          repo,
          productRepo,
          locationRepo,
          warehouseRepo,
          moveRepo,
          reservationRepo,
          settingsRepo,
          idempotency,
          idGenerator: idGen,
          clock,
          audit,
        }),
      inject: [
        DOCUMENT_REPO,
        PRODUCT_REPO,
        LOCATION_REPO,
        WAREHOUSE_REPO,
        STOCK_MOVE_REPO,
        STOCK_RESERVATION_REPO,
        INVENTORY_SETTINGS_REPO,
        IDEMPOTENCY_STORAGE_PORT_TOKEN,
        ID_GENERATOR_TOKEN,
        CLOCK_PORT_TOKEN,
        AUDIT_PORT,
      ],
    },
    {
      provide: GetInventoryDocumentUseCase,
      useFactory: (
        repo: PrismaInventoryDocumentRepository,
        productRepo: PrismaProductRepository,
        locationRepo: PrismaLocationRepository,
        warehouseRepo: PrismaWarehouseRepository,
        moveRepo: PrismaStockMoveRepository,
        reservationRepo: PrismaStockReservationRepository,
        settingsRepo: PrismaInventorySettingsRepository,
        idempotency: IdempotencyStoragePort,
        idGen: SystemIdGenerator,
        clock: SystemClock,
        audit: AuditPort
      ) =>
        new GetInventoryDocumentUseCase({
          logger: new NestLoggerAdapter(),
          repo,
          productRepo,
          locationRepo,
          warehouseRepo,
          moveRepo,
          reservationRepo,
          settingsRepo,
          idempotency,
          idGenerator: idGen,
          clock,
          audit,
        }),
      inject: [
        DOCUMENT_REPO,
        PRODUCT_REPO,
        LOCATION_REPO,
        WAREHOUSE_REPO,
        STOCK_MOVE_REPO,
        STOCK_RESERVATION_REPO,
        INVENTORY_SETTINGS_REPO,
        IDEMPOTENCY_STORAGE_PORT_TOKEN,
        ID_GENERATOR_TOKEN,
        CLOCK_PORT_TOKEN,
        AUDIT_PORT,
      ],
    },
    {
      provide: ListInventoryDocumentsUseCase,
      useFactory: (
        repo: PrismaInventoryDocumentRepository,
        productRepo: PrismaProductRepository,
        locationRepo: PrismaLocationRepository,
        warehouseRepo: PrismaWarehouseRepository,
        moveRepo: PrismaStockMoveRepository,
        reservationRepo: PrismaStockReservationRepository,
        settingsRepo: PrismaInventorySettingsRepository,
        idempotency: IdempotencyStoragePort,
        idGen: SystemIdGenerator,
        clock: SystemClock,
        audit: AuditPort
      ) =>
        new ListInventoryDocumentsUseCase({
          logger: new NestLoggerAdapter(),
          repo,
          productRepo,
          locationRepo,
          warehouseRepo,
          moveRepo,
          reservationRepo,
          settingsRepo,
          idempotency,
          idGenerator: idGen,
          clock,
          audit,
        }),
      inject: [
        DOCUMENT_REPO,
        PRODUCT_REPO,
        LOCATION_REPO,
        WAREHOUSE_REPO,
        STOCK_MOVE_REPO,
        STOCK_RESERVATION_REPO,
        INVENTORY_SETTINGS_REPO,
        IDEMPOTENCY_STORAGE_PORT_TOKEN,
        ID_GENERATOR_TOKEN,
        CLOCK_PORT_TOKEN,
        AUDIT_PORT,
      ],
    },
    {
      provide: GetOnHandUseCase,
      useFactory: (
        moveRepo: PrismaStockMoveRepository,
        reservationRepo: PrismaStockReservationRepository,
        locationRepo: PrismaLocationRepository
      ) =>
        new GetOnHandUseCase({
          logger: new NestLoggerAdapter(),
          moveRepo,
          reservationRepo,
          locationRepo,
        }),
      inject: [STOCK_MOVE_REPO, STOCK_RESERVATION_REPO, LOCATION_REPO],
    },
    {
      provide: GetAvailableUseCase,
      useFactory: (
        moveRepo: PrismaStockMoveRepository,
        reservationRepo: PrismaStockReservationRepository,
        locationRepo: PrismaLocationRepository
      ) =>
        new GetAvailableUseCase({
          logger: new NestLoggerAdapter(),
          moveRepo,
          reservationRepo,
          locationRepo,
        }),
      inject: [STOCK_MOVE_REPO, STOCK_RESERVATION_REPO, LOCATION_REPO],
    },
    {
      provide: ListStockMovesUseCase,
      useFactory: (
        moveRepo: PrismaStockMoveRepository,
        reservationRepo: PrismaStockReservationRepository,
        locationRepo: PrismaLocationRepository
      ) =>
        new ListStockMovesUseCase({
          logger: new NestLoggerAdapter(),
          moveRepo,
          reservationRepo,
          locationRepo,
        }),
      inject: [STOCK_MOVE_REPO, STOCK_RESERVATION_REPO, LOCATION_REPO],
    },
    {
      provide: ListReservationsUseCase,
      useFactory: (
        moveRepo: PrismaStockMoveRepository,
        reservationRepo: PrismaStockReservationRepository,
        locationRepo: PrismaLocationRepository
      ) =>
        new ListReservationsUseCase({
          logger: new NestLoggerAdapter(),
          moveRepo,
          reservationRepo,
          locationRepo,
        }),
      inject: [STOCK_MOVE_REPO, STOCK_RESERVATION_REPO, LOCATION_REPO],
    },
    {
      provide: ListReorderPoliciesUseCase,
      useFactory: (
        repo: PrismaReorderPolicyRepository,
        productRepo: PrismaProductRepository,
        warehouseRepo: PrismaWarehouseRepository,
        locationRepo: PrismaLocationRepository,
        moveRepo: PrismaStockMoveRepository,
        reservationRepo: PrismaStockReservationRepository,
        idempotency: IdempotencyStoragePort,
        idGen: SystemIdGenerator,
        clock: SystemClock,
        audit: AuditPort
      ) =>
        new ListReorderPoliciesUseCase({
          logger: new NestLoggerAdapter(),
          repo,
          productRepo,
          warehouseRepo,
          locationRepo,
          moveRepo,
          reservationRepo,
          idempotency,
          idGenerator: idGen,
          clock,
          audit,
        }),
      inject: [
        REORDER_POLICY_REPO,
        PRODUCT_REPO,
        WAREHOUSE_REPO,
        LOCATION_REPO,
        STOCK_MOVE_REPO,
        STOCK_RESERVATION_REPO,
        IDEMPOTENCY_STORAGE_PORT_TOKEN,
        ID_GENERATOR_TOKEN,
        CLOCK_PORT_TOKEN,
        AUDIT_PORT,
      ],
    },
    {
      provide: CreateReorderPolicyUseCase,
      useFactory: (
        repo: PrismaReorderPolicyRepository,
        productRepo: PrismaProductRepository,
        warehouseRepo: PrismaWarehouseRepository,
        locationRepo: PrismaLocationRepository,
        moveRepo: PrismaStockMoveRepository,
        reservationRepo: PrismaStockReservationRepository,
        idempotency: IdempotencyStoragePort,
        idGen: SystemIdGenerator,
        clock: SystemClock,
        audit: AuditPort
      ) =>
        new CreateReorderPolicyUseCase({
          logger: new NestLoggerAdapter(),
          repo,
          productRepo,
          warehouseRepo,
          locationRepo,
          moveRepo,
          reservationRepo,
          idempotency,
          idGenerator: idGen,
          clock,
          audit,
        }),
      inject: [
        REORDER_POLICY_REPO,
        PRODUCT_REPO,
        WAREHOUSE_REPO,
        LOCATION_REPO,
        STOCK_MOVE_REPO,
        STOCK_RESERVATION_REPO,
        IDEMPOTENCY_STORAGE_PORT_TOKEN,
        ID_GENERATOR_TOKEN,
        CLOCK_PORT_TOKEN,
        AUDIT_PORT,
      ],
    },
    {
      provide: UpdateReorderPolicyUseCase,
      useFactory: (
        repo: PrismaReorderPolicyRepository,
        productRepo: PrismaProductRepository,
        warehouseRepo: PrismaWarehouseRepository,
        locationRepo: PrismaLocationRepository,
        moveRepo: PrismaStockMoveRepository,
        reservationRepo: PrismaStockReservationRepository,
        idempotency: IdempotencyStoragePort,
        idGen: SystemIdGenerator,
        clock: SystemClock,
        audit: AuditPort
      ) =>
        new UpdateReorderPolicyUseCase({
          logger: new NestLoggerAdapter(),
          repo,
          productRepo,
          warehouseRepo,
          locationRepo,
          moveRepo,
          reservationRepo,
          idempotency,
          idGenerator: idGen,
          clock,
          audit,
        }),
      inject: [
        REORDER_POLICY_REPO,
        PRODUCT_REPO,
        WAREHOUSE_REPO,
        LOCATION_REPO,
        STOCK_MOVE_REPO,
        STOCK_RESERVATION_REPO,
        IDEMPOTENCY_STORAGE_PORT_TOKEN,
        ID_GENERATOR_TOKEN,
        CLOCK_PORT_TOKEN,
        AUDIT_PORT,
      ],
    },
    {
      provide: GetReorderSuggestionsUseCase,
      useFactory: (
        repo: PrismaReorderPolicyRepository,
        productRepo: PrismaProductRepository,
        warehouseRepo: PrismaWarehouseRepository,
        locationRepo: PrismaLocationRepository,
        moveRepo: PrismaStockMoveRepository,
        reservationRepo: PrismaStockReservationRepository,
        idempotency: IdempotencyStoragePort,
        idGen: SystemIdGenerator,
        clock: SystemClock,
        audit: AuditPort
      ) =>
        new GetReorderSuggestionsUseCase({
          logger: new NestLoggerAdapter(),
          repo,
          productRepo,
          warehouseRepo,
          locationRepo,
          moveRepo,
          reservationRepo,
          idempotency,
          idGenerator: idGen,
          clock,
          audit,
        }),
      inject: [
        REORDER_POLICY_REPO,
        PRODUCT_REPO,
        WAREHOUSE_REPO,
        LOCATION_REPO,
        STOCK_MOVE_REPO,
        STOCK_RESERVATION_REPO,
        IDEMPOTENCY_STORAGE_PORT_TOKEN,
        ID_GENERATOR_TOKEN,
        CLOCK_PORT_TOKEN,
        AUDIT_PORT,
      ],
    },
    {
      provide: GetLowStockUseCase,
      useFactory: (
        repo: PrismaReorderPolicyRepository,
        productRepo: PrismaProductRepository,
        warehouseRepo: PrismaWarehouseRepository,
        locationRepo: PrismaLocationRepository,
        moveRepo: PrismaStockMoveRepository,
        reservationRepo: PrismaStockReservationRepository,
        idempotency: IdempotencyStoragePort,
        idGen: SystemIdGenerator,
        clock: SystemClock,
        audit: AuditPort
      ) =>
        new GetLowStockUseCase({
          logger: new NestLoggerAdapter(),
          repo,
          productRepo,
          warehouseRepo,
          locationRepo,
          moveRepo,
          reservationRepo,
          idempotency,
          idGenerator: idGen,
          clock,
          audit,
        }),
      inject: [
        REORDER_POLICY_REPO,
        PRODUCT_REPO,
        WAREHOUSE_REPO,
        LOCATION_REPO,
        STOCK_MOVE_REPO,
        STOCK_RESERVATION_REPO,
        IDEMPOTENCY_STORAGE_PORT_TOKEN,
        ID_GENERATOR_TOKEN,
        CLOCK_PORT_TOKEN,
        AUDIT_PORT,
      ],
    },
    {
      provide: InventoryApplication,
      useFactory: (
        createProduct: CreateProductUseCase,
        updateProduct: UpdateProductUseCase,
        activateProduct: ActivateProductUseCase,
        deactivateProduct: DeactivateProductUseCase,
        getProduct: GetProductUseCase,
        listProducts: ListProductsUseCase,
        createWarehouse: CreateWarehouseUseCase,
        updateWarehouse: UpdateWarehouseUseCase,
        getWarehouse: GetWarehouseUseCase,
        listWarehouses: ListWarehousesUseCase,
        createLocation: CreateLocationUseCase,
        updateLocation: UpdateLocationUseCase,
        listLocations: ListLocationsUseCase,
        createDocument: CreateInventoryDocumentUseCase,
        updateDocument: UpdateInventoryDocumentUseCase,
        confirmDocument: ConfirmInventoryDocumentUseCase,
        postDocument: PostInventoryDocumentUseCase,
        cancelDocument: CancelInventoryDocumentUseCase,
        getDocument: GetInventoryDocumentUseCase,
        listDocuments: ListInventoryDocumentsUseCase,
        getOnHand: GetOnHandUseCase,
        getAvailable: GetAvailableUseCase,
        listStockMoves: ListStockMovesUseCase,
        listReservations: ListReservationsUseCase,
        listReorderPolicies: ListReorderPoliciesUseCase,
        createReorderPolicy: CreateReorderPolicyUseCase,
        updateReorderPolicy: UpdateReorderPolicyUseCase,
        getReorderSuggestions: GetReorderSuggestionsUseCase,
        getLowStock: GetLowStockUseCase
      ) =>
        new InventoryApplication(
          createProduct,
          updateProduct,
          activateProduct,
          deactivateProduct,
          getProduct,
          listProducts,
          createWarehouse,
          updateWarehouse,
          getWarehouse,
          listWarehouses,
          createLocation,
          updateLocation,
          listLocations,
          createDocument,
          updateDocument,
          confirmDocument,
          postDocument,
          cancelDocument,
          getDocument,
          listDocuments,
          getOnHand,
          getAvailable,
          listStockMoves,
          listReservations,
          listReorderPolicies,
          createReorderPolicy,
          updateReorderPolicy,
          getReorderSuggestions,
          getLowStock
        ),
      inject: [
        CreateProductUseCase,
        UpdateProductUseCase,
        ActivateProductUseCase,
        DeactivateProductUseCase,
        GetProductUseCase,
        ListProductsUseCase,
        CreateWarehouseUseCase,
        UpdateWarehouseUseCase,
        GetWarehouseUseCase,
        ListWarehousesUseCase,
        CreateLocationUseCase,
        UpdateLocationUseCase,
        ListLocationsUseCase,
        CreateInventoryDocumentUseCase,
        UpdateInventoryDocumentUseCase,
        ConfirmInventoryDocumentUseCase,
        PostInventoryDocumentUseCase,
        CancelInventoryDocumentUseCase,
        GetInventoryDocumentUseCase,
        ListInventoryDocumentsUseCase,
        GetOnHandUseCase,
        GetAvailableUseCase,
        ListStockMovesUseCase,
        ListReservationsUseCase,
        ListReorderPoliciesUseCase,
        CreateReorderPolicyUseCase,
        UpdateReorderPolicyUseCase,
        GetReorderSuggestionsUseCase,
        GetLowStockUseCase,
      ],
    },
  ],
  exports: [InventoryApplication],
})
export class InventoryModule {}
