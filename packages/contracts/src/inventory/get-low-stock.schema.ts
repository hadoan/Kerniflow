import { z } from "zod";
import { ReorderSuggestionDtoSchema } from "./inventory.types";

export const LowStockThresholdModeSchema = z.enum(["MIN", "REORDER_POINT"]);
export type LowStockThresholdMode = z.infer<typeof LowStockThresholdModeSchema>;

export const GetLowStockInputSchema = z.object({
  warehouseId: z.string().optional(),
  thresholdMode: LowStockThresholdModeSchema.optional(),
});

export const GetLowStockOutputSchema = z.object({
  items: z.array(ReorderSuggestionDtoSchema),
});

export type GetLowStockInput = z.infer<typeof GetLowStockInputSchema>;
export type GetLowStockOutput = z.infer<typeof GetLowStockOutputSchema>;
