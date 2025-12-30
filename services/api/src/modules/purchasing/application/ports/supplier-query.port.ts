import type { PartyDto } from "@corely/contracts";

export type ListSuppliersResult = {
  suppliers: PartyDto[];
  nextCursor?: string | null;
};

export interface SupplierQueryPort {
  getSupplierById(tenantId: string, supplierPartyId: string): Promise<PartyDto | null>;
  listSuppliers(
    tenantId: string,
    params: { search?: string; cursor?: string; pageSize?: number }
  ): Promise<ListSuppliersResult>;
}

export const SUPPLIER_QUERY_PORT = "purchasing/supplier-query";
