import { z } from "zod";
import { LocationDtoSchema, LocationTypeSchema } from "./inventory.types";

export const CreateLocationInputSchema = z.object({
  warehouseId: z.string(),
  name: z.string(),
  locationType: LocationTypeSchema,
  isActive: z.boolean().optional(),
  idempotencyKey: z.string().optional(),
});

export const CreateLocationOutputSchema = z.object({
  location: LocationDtoSchema,
});

export type CreateLocationInput = z.infer<typeof CreateLocationInputSchema>;
export type CreateLocationOutput = z.infer<typeof CreateLocationOutputSchema>;
