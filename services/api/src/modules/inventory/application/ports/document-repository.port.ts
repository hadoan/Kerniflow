import type { InventoryDocumentAggregate } from "../../domain/inventory-document.aggregate";
import type { InventoryDocumentStatus, InventoryDocumentType } from "../../domain/inventory.types";
import type { LocalDate } from "@corely/kernel";

export type ListDocumentsFilters = {
  type?: InventoryDocumentType;
  status?: InventoryDocumentStatus;
  partyId?: string;
  fromDate?: LocalDate;
  toDate?: LocalDate;
  search?: string;
  cursor?: string;
  pageSize?: number;
};

export type ListDocumentsResult = {
  items: InventoryDocumentAggregate[];
  nextCursor?: string | null;
};

export const DOCUMENT_REPO = "inventory/document-repository";

export interface InventoryDocumentRepositoryPort {
  create(tenantId: string, document: InventoryDocumentAggregate): Promise<void>;
  save(tenantId: string, document: InventoryDocumentAggregate): Promise<void>;
  findById(tenantId: string, documentId: string): Promise<InventoryDocumentAggregate | null>;
  list(tenantId: string, filters: ListDocumentsFilters): Promise<ListDocumentsResult>;
  isDocumentNumberTaken(tenantId: string, documentNumber: string): Promise<boolean>;
}
