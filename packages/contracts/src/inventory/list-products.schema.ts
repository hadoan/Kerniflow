import { z } from "zod";
import { ProductDtoSchema, ProductTypeSchema } from "./inventory.types";

export const ListProductsInputSchema = z.object({
  search: z.string().optional(),
  type: ProductTypeSchema.optional(),
  isActive: z.boolean().optional(),
  cursor: z.string().optional(),
  pageSize: z.number().int().positive().max(100).optional(),
});

export const ListProductsOutputSchema = z.object({
  items: z.array(ProductDtoSchema),
  nextCursor: z.string().nullable().optional(),
});

export type ListProductsInput = z.infer<typeof ListProductsInputSchema>;
export type ListProductsOutput = z.infer<typeof ListProductsOutputSchema>;
