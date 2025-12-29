import { z } from "zod";
import { StockMoveDtoSchema } from "./inventory.types";
import { localDateSchema } from "../shared/local-date.schema";

export const ListStockMovesInputSchema = z.object({
  productId: z.string().optional(),
  warehouseId: z.string().optional(),
  fromDate: localDateSchema.optional(),
  toDate: localDateSchema.optional(),
  cursor: z.string().optional(),
  pageSize: z.number().int().positive().max(100).optional(),
});

export const ListStockMovesOutputSchema = z.object({
  items: z.array(StockMoveDtoSchema),
  nextCursor: z.string().nullable().optional(),
});

export type ListStockMovesInput = z.infer<typeof ListStockMovesInputSchema>;
export type ListStockMovesOutput = z.infer<typeof ListStockMovesOutputSchema>;
