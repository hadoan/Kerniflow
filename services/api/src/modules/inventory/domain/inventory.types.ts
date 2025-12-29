import type { LocalDate } from "@kerniflow/kernel";

export type ProductType = "STOCKABLE" | "CONSUMABLE" | "SERVICE";
export type LocationType = "INTERNAL" | "RECEIVING" | "SHIPPING" | "VIRTUAL";
export type InventoryDocumentType = "RECEIPT" | "DELIVERY" | "TRANSFER" | "ADJUSTMENT";
export type InventoryDocumentStatus = "DRAFT" | "CONFIRMED" | "POSTED" | "CANCELED";
export type StockMoveReason = "RECEIPT" | "SHIPMENT" | "TRANSFER" | "ADJUSTMENT";
export type ReservationStatus = "ACTIVE" | "RELEASED" | "FULFILLED";
export type NegativeStockPolicy = "DISALLOW" | "ALLOW";
export type ReservationPolicy = "FULL_ONLY";

export type InventoryDocumentLine = {
  id: string;
  productId: string;
  quantity: number;
  unitCostCents?: number | null;
  fromLocationId?: string | null;
  toLocationId?: string | null;
  notes?: string | null;
  reservedQuantity?: number | null;
};

export type InventoryDocumentProps = {
  id: string;
  tenantId: string;
  documentType: InventoryDocumentType;
  documentNumber: string | null;
  status: InventoryDocumentStatus;
  reference?: string | null;
  scheduledDate?: LocalDate | null;
  postingDate?: LocalDate | null;
  notes?: string | null;
  partyId?: string | null;
  sourceType?: string | null;
  sourceId?: string | null;
  lines: InventoryDocumentLine[];
  createdAt: Date;
  updatedAt: Date;
  confirmedAt?: Date | null;
  postedAt?: Date | null;
  canceledAt?: Date | null;
};

export type StockReservation = {
  id: string;
  tenantId: string;
  productId: string;
  locationId: string;
  documentId: string;
  reservedQty: number;
  status: ReservationStatus;
  createdAt: Date;
  releasedAt?: Date | null;
  fulfilledAt?: Date | null;
  createdByUserId?: string | null;
};

export type StockMove = {
  id: string;
  tenantId: string;
  postingDate: LocalDate;
  productId: string;
  quantityDelta: number;
  locationId: string;
  documentType: InventoryDocumentType;
  documentId: string;
  lineId: string;
  reasonCode: StockMoveReason;
  createdAt: Date;
  createdByUserId?: string | null;
};

export type InventorySettingsProps = {
  id: string;
  tenantId: string;
  receiptPrefix: string;
  receiptNextNumber: number;
  deliveryPrefix: string;
  deliveryNextNumber: number;
  transferPrefix: string;
  transferNextNumber: number;
  adjustmentPrefix: string;
  adjustmentNextNumber: number;
  negativeStockPolicy: NegativeStockPolicy;
  reservationPolicy: ReservationPolicy;
  defaultWarehouseId?: string | null;
  createdAt: Date;
  updatedAt: Date;
};
