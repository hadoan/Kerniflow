import { z } from "zod";
import { WarehouseDtoSchema } from "./inventory.types";

export const UpdateWarehousePatchSchema = z.object({
  name: z.string().optional(),
  isDefault: z.boolean().optional(),
  address: z.string().nullable().optional(),
});

export const UpdateWarehouseInputSchema = z.object({
  warehouseId: z.string(),
  patch: UpdateWarehousePatchSchema,
});

export const UpdateWarehouseOutputSchema = z.object({
  warehouse: WarehouseDtoSchema,
});

export type UpdateWarehousePatch = z.infer<typeof UpdateWarehousePatchSchema>;
export type UpdateWarehouseInput = z.infer<typeof UpdateWarehouseInputSchema>;
export type UpdateWarehouseOutput = z.infer<typeof UpdateWarehouseOutputSchema>;
