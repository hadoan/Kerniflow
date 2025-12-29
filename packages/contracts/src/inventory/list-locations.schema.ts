import { z } from "zod";
import { LocationDtoSchema } from "./inventory.types";

export const ListLocationsInputSchema = z.object({
  warehouseId: z.string(),
});

export const ListLocationsOutputSchema = z.object({
  items: z.array(LocationDtoSchema),
});

export type ListLocationsInput = z.infer<typeof ListLocationsInputSchema>;
export type ListLocationsOutput = z.infer<typeof ListLocationsOutputSchema>;
