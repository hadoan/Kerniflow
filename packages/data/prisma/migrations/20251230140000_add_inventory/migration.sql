-- CreateEnum
CREATE TYPE "ProductType" AS ENUM ('STOCKABLE', 'CONSUMABLE', 'SERVICE');

-- CreateEnum
CREATE TYPE "LocationType" AS ENUM ('INTERNAL', 'RECEIVING', 'SHIPPING', 'VIRTUAL');

-- CreateEnum
CREATE TYPE "InventoryDocumentType" AS ENUM ('RECEIPT', 'DELIVERY', 'TRANSFER', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "InventoryDocumentStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'POSTED', 'CANCELED');

-- CreateEnum
CREATE TYPE "StockMoveReason" AS ENUM ('RECEIPT', 'SHIPMENT', 'TRANSFER', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "ReservationStatus" AS ENUM ('ACTIVE', 'RELEASED', 'FULFILLED');

-- CreateEnum
CREATE TYPE "NegativeStockPolicy" AS ENUM ('DISALLOW', 'ALLOW');

-- CreateEnum
CREATE TYPE "ReservationPolicy" AS ENUM ('FULL_ONLY');

-- CreateTable
CREATE TABLE "InventoryProduct" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "sku" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "productType" "ProductType" NOT NULL,
  "unitOfMeasure" TEXT NOT NULL,
  "barcode" TEXT,
  "defaultSalesPriceCents" INTEGER,
  "defaultPurchaseCostCents" INTEGER,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "createdByUserId" TEXT,
  "updatedByUserId" TEXT,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL,

  CONSTRAINT "InventoryProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryWarehouse" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "address" TEXT,
  "createdByUserId" TEXT,
  "updatedByUserId" TEXT,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL,

  CONSTRAINT "InventoryWarehouse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryLocation" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "warehouseId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "locationType" "LocationType" NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdByUserId" TEXT,
  "updatedByUserId" TEXT,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL,

  CONSTRAINT "InventoryLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryDocument" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "documentType" "InventoryDocumentType" NOT NULL,
  "documentNumber" TEXT,
  "status" "InventoryDocumentStatus" NOT NULL DEFAULT 'DRAFT',
  "reference" TEXT,
  "scheduledDate" DATE,
  "postingDate" DATE,
  "notes" TEXT,
  "partyId" TEXT,
  "sourceType" TEXT,
  "sourceId" TEXT,
  "confirmedAt" TIMESTAMPTZ(6),
  "postedAt" TIMESTAMPTZ(6),
  "canceledAt" TIMESTAMPTZ(6),
  "createdByUserId" TEXT,
  "updatedByUserId" TEXT,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL,

  CONSTRAINT "InventoryDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryDocumentLine" (
  "id" TEXT NOT NULL,
  "documentId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "unitCostCents" INTEGER,
  "fromLocationId" TEXT,
  "toLocationId" TEXT,
  "notes" TEXT,
  "reservedQuantity" INTEGER,

  CONSTRAINT "InventoryDocumentLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockMove" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "postingDate" DATE NOT NULL,
  "productId" TEXT NOT NULL,
  "quantityDelta" INTEGER NOT NULL,
  "locationId" TEXT NOT NULL,
  "documentType" "InventoryDocumentType" NOT NULL,
  "documentId" TEXT NOT NULL,
  "lineId" TEXT NOT NULL,
  "reasonCode" "StockMoveReason" NOT NULL,
  "createdByUserId" TEXT,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "StockMove_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockReservation" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "locationId" TEXT NOT NULL,
  "documentId" TEXT NOT NULL,
  "reservedQty" INTEGER NOT NULL,
  "status" "ReservationStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdByUserId" TEXT,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "releasedAt" TIMESTAMPTZ(6),
  "fulfilledAt" TIMESTAMPTZ(6),

  CONSTRAINT "StockReservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReorderPolicy" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "warehouseId" TEXT NOT NULL,
  "minQty" INTEGER NOT NULL,
  "maxQty" INTEGER,
  "reorderPoint" INTEGER,
  "preferredSupplierPartyId" TEXT,
  "leadTimeDays" INTEGER,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL,

  CONSTRAINT "ReorderPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventorySettings" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "receiptPrefix" TEXT NOT NULL DEFAULT 'RCPT-',
  "receiptNextNumber" INTEGER NOT NULL DEFAULT 1,
  "deliveryPrefix" TEXT NOT NULL DEFAULT 'DLV-',
  "deliveryNextNumber" INTEGER NOT NULL DEFAULT 1,
  "transferPrefix" TEXT NOT NULL DEFAULT 'TRF-',
  "transferNextNumber" INTEGER NOT NULL DEFAULT 1,
  "adjustmentPrefix" TEXT NOT NULL DEFAULT 'ADJ-',
  "adjustmentNextNumber" INTEGER NOT NULL DEFAULT 1,
  "negativeStockPolicy" "NegativeStockPolicy" NOT NULL DEFAULT 'DISALLOW',
  "reservationPolicy" "ReservationPolicy" NOT NULL DEFAULT 'FULL_ONLY',
  "defaultWarehouseId" TEXT,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL,

  CONSTRAINT "InventorySettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InventoryProduct_tenantId_sku_key" ON "InventoryProduct"("tenantId", "sku");

-- CreateIndex
CREATE INDEX "InventoryProduct_tenantId_productType_idx" ON "InventoryProduct"("tenantId", "productType");

-- CreateIndex
CREATE INDEX "InventoryProduct_tenantId_isActive_idx" ON "InventoryProduct"("tenantId", "isActive");

-- CreateIndex
CREATE INDEX "InventoryWarehouse_tenantId_isDefault_idx" ON "InventoryWarehouse"("tenantId", "isDefault");

-- CreateIndex
CREATE INDEX "InventoryLocation_tenantId_warehouseId_idx" ON "InventoryLocation"("tenantId", "warehouseId");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryDocument_tenantId_documentNumber_key" ON "InventoryDocument"("tenantId", "documentNumber");

-- CreateIndex
CREATE INDEX "InventoryDocument_tenantId_status_idx" ON "InventoryDocument"("tenantId", "status");

-- CreateIndex
CREATE INDEX "InventoryDocument_tenantId_documentType_idx" ON "InventoryDocument"("tenantId", "documentType");

-- CreateIndex
CREATE INDEX "InventoryDocument_tenantId_partyId_idx" ON "InventoryDocument"("tenantId", "partyId");

-- CreateIndex
CREATE INDEX "InventoryDocument_tenantId_createdAt_idx" ON "InventoryDocument"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "InventoryDocumentLine_documentId_idx" ON "InventoryDocumentLine"("documentId");

-- CreateIndex
CREATE INDEX "InventoryDocumentLine_productId_idx" ON "InventoryDocumentLine"("productId");

-- CreateIndex
CREATE INDEX "StockMove_tenantId_productId_idx" ON "StockMove"("tenantId", "productId");

-- CreateIndex
CREATE INDEX "StockMove_tenantId_locationId_idx" ON "StockMove"("tenantId", "locationId");

-- CreateIndex
CREATE INDEX "StockMove_tenantId_postingDate_idx" ON "StockMove"("tenantId", "postingDate");

-- CreateIndex
CREATE INDEX "StockReservation_tenantId_documentId_idx" ON "StockReservation"("tenantId", "documentId");

-- CreateIndex
CREATE INDEX "StockReservation_tenantId_productId_idx" ON "StockReservation"("tenantId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "ReorderPolicy_tenantId_productId_warehouseId_key" ON "ReorderPolicy"("tenantId", "productId", "warehouseId");

-- CreateIndex
CREATE INDEX "ReorderPolicy_tenantId_warehouseId_idx" ON "ReorderPolicy"("tenantId", "warehouseId");

-- CreateIndex
CREATE UNIQUE INDEX "InventorySettings_tenantId_key" ON "InventorySettings"("tenantId");

-- AddForeignKey
ALTER TABLE "InventoryLocation" ADD CONSTRAINT "InventoryLocation_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "InventoryWarehouse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryDocumentLine" ADD CONSTRAINT "InventoryDocumentLine_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "InventoryDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
