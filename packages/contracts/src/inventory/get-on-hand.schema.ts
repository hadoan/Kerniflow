import { z } from "zod";
import { StockLevelDtoSchema } from "./inventory.types";

export const GetOnHandInputSchema = z.object({
  productId: z.string().optional(),
  warehouseId: z.string().optional(),
  locationId: z.string().optional(),
});

export const GetOnHandOutputSchema = z.object({
  items: z.array(StockLevelDtoSchema),
});

export type GetOnHandInput = z.infer<typeof GetOnHandInputSchema>;
export type GetOnHandOutput = z.infer<typeof GetOnHandOutputSchema>;
