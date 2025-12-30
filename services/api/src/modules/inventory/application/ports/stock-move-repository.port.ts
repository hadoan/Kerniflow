import type { LocalDate } from "@corely/kernel";
import type { StockMove } from "../../domain/inventory.types";

export type StockMoveFilters = {
  productId?: string;
  locationIds?: string[];
  fromDate?: LocalDate;
  toDate?: LocalDate;
  cursor?: string;
  pageSize?: number;
};

export type StockMoveListResult = {
  items: StockMove[];
  nextCursor?: string | null;
};

export type StockMoveSum = {
  productId: string;
  locationId: string;
  quantityDelta: number;
};

export const STOCK_MOVE_REPO = "inventory/stock-move-repository";

export interface StockMoveRepositoryPort {
  createMany(tenantId: string, moves: StockMove[]): Promise<void>;
  list(tenantId: string, filters: StockMoveFilters): Promise<StockMoveListResult>;
  sumByProductLocation(
    tenantId: string,
    filters: { productIds?: string[]; locationIds?: string[] }
  ): Promise<StockMoveSum[]>;
}
