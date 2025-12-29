export type ReorderPolicy = {
  id: string;
  tenantId: string;
  productId: string;
  warehouseId: string;
  minQty: number;
  maxQty?: number | null;
  reorderPoint?: number | null;
  preferredSupplierPartyId?: string | null;
  leadTimeDays?: number | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export const REORDER_POLICY_REPO = Symbol("REORDER_POLICY_REPO");

export interface ReorderPolicyRepositoryPort {
  create(tenantId: string, policy: ReorderPolicy): Promise<void>;
  save(tenantId: string, policy: ReorderPolicy): Promise<void>;
  findById(tenantId: string, policyId: string): Promise<ReorderPolicy | null>;
  findByProductWarehouse(
    tenantId: string,
    productId: string,
    warehouseId: string
  ): Promise<ReorderPolicy | null>;
  list(
    tenantId: string,
    filters: { productId?: string; warehouseId?: string }
  ): Promise<ReorderPolicy[]>;
}
