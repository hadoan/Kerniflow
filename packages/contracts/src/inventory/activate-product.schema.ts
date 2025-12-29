import { z } from "zod";
import { ProductDtoSchema } from "./inventory.types";

export const ActivateProductInputSchema = z.object({
  productId: z.string(),
  idempotencyKey: z.string().optional(),
});

export const ActivateProductOutputSchema = z.object({
  product: ProductDtoSchema,
});

export type ActivateProductInput = z.infer<typeof ActivateProductInputSchema>;
export type ActivateProductOutput = z.infer<typeof ActivateProductOutputSchema>;
