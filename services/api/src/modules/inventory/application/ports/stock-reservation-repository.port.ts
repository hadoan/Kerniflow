import type { StockReservation } from "../../domain/inventory.types";

export type ReservationFilters = {
  productId?: string;
  documentId?: string;
  cursor?: string;
  pageSize?: number;
};

export type ReservationListResult = {
  items: StockReservation[];
  nextCursor?: string | null;
};

export type ReservationSum = {
  productId: string;
  locationId: string;
  reservedQty: number;
};

export const STOCK_RESERVATION_REPO = Symbol("STOCK_RESERVATION_REPO");

export interface StockReservationRepositoryPort {
  createMany(tenantId: string, reservations: StockReservation[]): Promise<void>;
  list(tenantId: string, filters: ReservationFilters): Promise<ReservationListResult>;
  sumActiveByProductLocation(
    tenantId: string,
    filters: { productIds?: string[]; locationIds?: string[] }
  ): Promise<ReservationSum[]>;
  releaseByDocument(tenantId: string, documentId: string, releasedAt: Date): Promise<void>;
  fulfillByDocument(tenantId: string, documentId: string, fulfilledAt: Date): Promise<void>;
}
