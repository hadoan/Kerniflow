export type InventoryWarehouse = {
  id: string;
  tenantId: string;
  name: string;
  isDefault: boolean;
  address?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ListWarehousesResult = {
  items: InventoryWarehouse[];
  nextCursor?: string | null;
};

export type ListWarehousesFilters = {
  cursor?: string;
  pageSize?: number;
};

export const WAREHOUSE_REPO = Symbol("WAREHOUSE_REPO");

export interface WarehouseRepositoryPort {
  create(tenantId: string, warehouse: InventoryWarehouse): Promise<void>;
  save(tenantId: string, warehouse: InventoryWarehouse): Promise<void>;
  findById(tenantId: string, warehouseId: string): Promise<InventoryWarehouse | null>;
  findDefault(tenantId: string): Promise<InventoryWarehouse | null>;
  list(tenantId: string, filters: ListWarehousesFilters): Promise<ListWarehousesResult>;
}
