import { z } from "zod";
import { LocationDtoSchema, LocationTypeSchema } from "./inventory.types";

export const UpdateLocationPatchSchema = z.object({
  name: z.string().optional(),
  locationType: LocationTypeSchema.optional(),
  isActive: z.boolean().optional(),
});

export const UpdateLocationInputSchema = z.object({
  locationId: z.string(),
  patch: UpdateLocationPatchSchema,
});

export const UpdateLocationOutputSchema = z.object({
  location: LocationDtoSchema,
});

export type UpdateLocationPatch = z.infer<typeof UpdateLocationPatchSchema>;
export type UpdateLocationInput = z.infer<typeof UpdateLocationInputSchema>;
export type UpdateLocationOutput = z.infer<typeof UpdateLocationOutputSchema>;
