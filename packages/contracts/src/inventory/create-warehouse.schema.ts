import { z } from "zod";
import { WarehouseDtoSchema } from "./inventory.types";

export const CreateWarehouseInputSchema = z.object({
  name: z.string(),
  isDefault: z.boolean().optional(),
  address: z.string().optional(),
  idempotencyKey: z.string().optional(),
});

export const CreateWarehouseOutputSchema = z.object({
  warehouse: WarehouseDtoSchema,
});

export type CreateWarehouseInput = z.infer<typeof CreateWarehouseInputSchema>;
export type CreateWarehouseOutput = z.infer<typeof CreateWarehouseOutputSchema>;
