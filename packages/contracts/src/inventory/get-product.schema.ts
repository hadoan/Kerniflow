import { z } from "zod";
import { ProductDtoSchema } from "./inventory.types";

export const GetProductInputSchema = z.object({
  productId: z.string(),
});

export const GetProductOutputSchema = z.object({
  product: ProductDtoSchema,
});

export type GetProductInput = z.infer<typeof GetProductInputSchema>;
export type GetProductOutput = z.infer<typeof GetProductOutputSchema>;
