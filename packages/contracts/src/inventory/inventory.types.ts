import { z } from "zod";
import { localDateSchema, utcInstantSchema } from "../shared/local-date.schema";

export const ProductTypeSchema = z.enum(["STOCKABLE", "CONSUMABLE", "SERVICE"]);
export type ProductType = z.infer<typeof ProductTypeSchema>;

export const LocationTypeSchema = z.enum(["INTERNAL", "RECEIVING", "SHIPPING", "VIRTUAL"]);
export type LocationType = z.infer<typeof LocationTypeSchema>;

export const InventoryDocumentTypeSchema = z.enum([
  "RECEIPT",
  "DELIVERY",
  "TRANSFER",
  "ADJUSTMENT",
]);
export type InventoryDocumentType = z.infer<typeof InventoryDocumentTypeSchema>;

export const InventoryDocumentStatusSchema = z.enum(["DRAFT", "CONFIRMED", "POSTED", "CANCELED"]);
export type InventoryDocumentStatus = z.infer<typeof InventoryDocumentStatusSchema>;

export const StockMoveReasonSchema = z.enum(["RECEIPT", "SHIPMENT", "TRANSFER", "ADJUSTMENT"]);
export type StockMoveReason = z.infer<typeof StockMoveReasonSchema>;

export const ReservationStatusSchema = z.enum(["ACTIVE", "RELEASED", "FULFILLED"]);
export type ReservationStatus = z.infer<typeof ReservationStatusSchema>;

export const ProductDtoSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  sku: z.string(),
  name: z.string(),
  productType: ProductTypeSchema,
  unitOfMeasure: z.string(),
  barcode: z.string().nullable().optional(),
  defaultSalesPriceCents: z.number().int().nonnegative().nullable().optional(),
  defaultPurchaseCostCents: z.number().int().nonnegative().nullable().optional(),
  isActive: z.boolean(),
  tags: z.array(z.string()).optional(),
  createdAt: utcInstantSchema,
  updatedAt: utcInstantSchema,
});
export type ProductDto = z.infer<typeof ProductDtoSchema>;

export const WarehouseDtoSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  name: z.string(),
  isDefault: z.boolean(),
  address: z.string().nullable().optional(),
  createdAt: utcInstantSchema,
  updatedAt: utcInstantSchema,
});
export type WarehouseDto = z.infer<typeof WarehouseDtoSchema>;

export const LocationDtoSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  warehouseId: z.string(),
  name: z.string(),
  locationType: LocationTypeSchema,
  isActive: z.boolean(),
  createdAt: utcInstantSchema,
  updatedAt: utcInstantSchema,
});
export type LocationDto = z.infer<typeof LocationDtoSchema>;

export const InventoryDocumentLineDtoSchema = z.object({
  id: z.string(),
  productId: z.string(),
  quantity: z.number().positive(),
  unitCostCents: z.number().int().nonnegative().nullable().optional(),
  fromLocationId: z.string().nullable().optional(),
  toLocationId: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  reservedQuantity: z.number().nonnegative().optional(),
});
export type InventoryDocumentLineDto = z.infer<typeof InventoryDocumentLineDtoSchema>;

export const InventoryDocumentDtoSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  documentType: InventoryDocumentTypeSchema,
  documentNumber: z.string().nullable().optional(),
  status: InventoryDocumentStatusSchema,
  reference: z.string().nullable().optional(),
  scheduledDate: localDateSchema.nullable().optional(),
  postingDate: localDateSchema.nullable().optional(),
  notes: z.string().nullable().optional(),
  partyId: z.string().nullable().optional(),
  sourceType: z.string().nullable().optional(),
  sourceId: z.string().nullable().optional(),
  lines: z.array(InventoryDocumentLineDtoSchema),
  createdAt: utcInstantSchema,
  updatedAt: utcInstantSchema,
  confirmedAt: utcInstantSchema.nullable().optional(),
  postedAt: utcInstantSchema.nullable().optional(),
  canceledAt: utcInstantSchema.nullable().optional(),
});
export type InventoryDocumentDto = z.infer<typeof InventoryDocumentDtoSchema>;

export const StockMoveDtoSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  postingDate: localDateSchema,
  productId: z.string(),
  quantityDelta: z.number(),
  locationId: z.string(),
  documentType: InventoryDocumentTypeSchema,
  documentId: z.string(),
  lineId: z.string(),
  reasonCode: StockMoveReasonSchema,
  createdAt: utcInstantSchema,
});
export type StockMoveDto = z.infer<typeof StockMoveDtoSchema>;

export const StockReservationDtoSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  productId: z.string(),
  locationId: z.string(),
  documentId: z.string(),
  reservedQty: z.number().nonnegative(),
  status: ReservationStatusSchema,
  createdAt: utcInstantSchema,
  releasedAt: utcInstantSchema.nullable().optional(),
  fulfilledAt: utcInstantSchema.nullable().optional(),
});
export type StockReservationDto = z.infer<typeof StockReservationDtoSchema>;

export const StockLevelDtoSchema = z.object({
  productId: z.string(),
  warehouseId: z.string().nullable().optional(),
  locationId: z.string().nullable().optional(),
  onHandQty: z.number(),
  reservedQty: z.number(),
  availableQty: z.number(),
});
export type StockLevelDto = z.infer<typeof StockLevelDtoSchema>;

export const ReorderPolicyDtoSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  productId: z.string(),
  warehouseId: z.string(),
  minQty: z.number().nonnegative(),
  maxQty: z.number().nonnegative().nullable().optional(),
  reorderPoint: z.number().nonnegative().nullable().optional(),
  preferredSupplierPartyId: z.string().nullable().optional(),
  leadTimeDays: z.number().int().nonnegative().nullable().optional(),
  isActive: z.boolean(),
  createdAt: utcInstantSchema,
  updatedAt: utcInstantSchema,
});
export type ReorderPolicyDto = z.infer<typeof ReorderPolicyDtoSchema>;

export const ReorderSuggestionDtoSchema = z.object({
  productId: z.string(),
  warehouseId: z.string(),
  availableQty: z.number(),
  reorderPoint: z.number().nonnegative().nullable().optional(),
  minQty: z.number().nonnegative().nullable().optional(),
  suggestedQty: z.number().nonnegative(),
  preferredSupplierPartyId: z.string().nullable().optional(),
});
export type ReorderSuggestionDto = z.infer<typeof ReorderSuggestionDtoSchema>;
