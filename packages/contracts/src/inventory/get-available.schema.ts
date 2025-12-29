import { z } from "zod";
import { StockLevelDtoSchema } from "./inventory.types";

export const GetAvailableInputSchema = z.object({
  productId: z.string().optional(),
  warehouseId: z.string().optional(),
  locationId: z.string().optional(),
});

export const GetAvailableOutputSchema = z.object({
  items: z.array(StockLevelDtoSchema),
});

export type GetAvailableInput = z.infer<typeof GetAvailableInputSchema>;
export type GetAvailableOutput = z.infer<typeof GetAvailableOutputSchema>;
