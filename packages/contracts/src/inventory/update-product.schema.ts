import { z } from "zod";
import { ProductDtoSchema, ProductTypeSchema } from "./inventory.types";

export const UpdateProductPatchSchema = z.object({
  sku: z.string().optional(),
  name: z.string().optional(),
  productType: ProductTypeSchema.optional(),
  unitOfMeasure: z.string().optional(),
  barcode: z.string().nullable().optional(),
  defaultSalesPriceCents: z.number().int().nonnegative().nullable().optional(),
  defaultPurchaseCostCents: z.number().int().nonnegative().nullable().optional(),
  isActive: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
});

export const UpdateProductInputSchema = z.object({
  productId: z.string(),
  patch: UpdateProductPatchSchema,
});

export const UpdateProductOutputSchema = z.object({
  product: ProductDtoSchema,
});

export type UpdateProductPatch = z.infer<typeof UpdateProductPatchSchema>;
export type UpdateProductInput = z.infer<typeof UpdateProductInputSchema>;
export type UpdateProductOutput = z.infer<typeof UpdateProductOutputSchema>;
