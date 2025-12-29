import { z } from "zod";
import { WarehouseDtoSchema } from "./inventory.types";

export const ListWarehousesInputSchema = z.object({
  cursor: z.string().optional(),
  pageSize: z.number().int().positive().max(100).optional(),
});

export const ListWarehousesOutputSchema = z.object({
  items: z.array(WarehouseDtoSchema),
  nextCursor: z.string().nullable().optional(),
});

export type ListWarehousesInput = z.infer<typeof ListWarehousesInputSchema>;
export type ListWarehousesOutput = z.infer<typeof ListWarehousesOutputSchema>;
