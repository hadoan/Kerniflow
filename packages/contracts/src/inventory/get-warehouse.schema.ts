import { z } from "zod";
import { WarehouseDtoSchema } from "./inventory.types";

export const GetWarehouseInputSchema = z.object({
  warehouseId: z.string(),
});

export const GetWarehouseOutputSchema = z.object({
  warehouse: WarehouseDtoSchema,
});

export type GetWarehouseInput = z.infer<typeof GetWarehouseInputSchema>;
export type GetWarehouseOutput = z.infer<typeof GetWarehouseOutputSchema>;
