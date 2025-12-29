import type { ProductType } from "../../domain/inventory.types";

export type InventoryProduct = {
  id: string;
  tenantId: string;
  sku: string;
  name: string;
  productType: ProductType;
  unitOfMeasure: string;
  barcode?: string | null;
  defaultSalesPriceCents?: number | null;
  defaultPurchaseCostCents?: number | null;
  isActive: boolean;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
};

export type ListProductsFilters = {
  search?: string;
  type?: ProductType;
  isActive?: boolean;
  cursor?: string;
  pageSize?: number;
};

export type ListProductsResult = {
  items: InventoryProduct[];
  nextCursor?: string | null;
};

export const PRODUCT_REPO = Symbol("PRODUCT_REPO");

export interface ProductRepositoryPort {
  create(tenantId: string, product: InventoryProduct): Promise<void>;
  save(tenantId: string, product: InventoryProduct): Promise<void>;
  findById(tenantId: string, productId: string): Promise<InventoryProduct | null>;
  findBySku(tenantId: string, sku: string): Promise<InventoryProduct | null>;
  list(tenantId: string, filters: ListProductsFilters): Promise<ListProductsResult>;
}
