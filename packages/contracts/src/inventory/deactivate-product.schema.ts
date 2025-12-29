import { z } from "zod";
import { ProductDtoSchema } from "./inventory.types";

export const DeactivateProductInputSchema = z.object({
  productId: z.string(),
  idempotencyKey: z.string().optional(),
});

export const DeactivateProductOutputSchema = z.object({
  product: ProductDtoSchema,
});

export type DeactivateProductInput = z.infer<typeof DeactivateProductInputSchema>;
export type DeactivateProductOutput = z.infer<typeof DeactivateProductOutputSchema>;
