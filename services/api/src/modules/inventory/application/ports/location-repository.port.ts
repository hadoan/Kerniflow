import type { LocationType } from "../../domain/inventory.types";

export type InventoryLocation = {
  id: string;
  tenantId: string;
  warehouseId: string;
  name: string;
  locationType: LocationType;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export const LOCATION_REPO = Symbol("LOCATION_REPO");

export interface LocationRepositoryPort {
  create(tenantId: string, location: InventoryLocation): Promise<void>;
  save(tenantId: string, location: InventoryLocation): Promise<void>;
  findById(tenantId: string, locationId: string): Promise<InventoryLocation | null>;
  listByWarehouse(tenantId: string, warehouseId: string): Promise<InventoryLocation[]>;
  findByWarehouseType(
    tenantId: string,
    warehouseId: string,
    locationType: LocationType
  ): Promise<InventoryLocation | null>;
}
