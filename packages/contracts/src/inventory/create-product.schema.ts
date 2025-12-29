import { z } from "zod";
import { ProductDtoSchema, ProductTypeSchema } from "./inventory.types";

export const CreateProductInputSchema = z.object({
  sku: z.string(),
  name: z.string(),
  productType: ProductTypeSchema,
  unitOfMeasure: z.string(),
  barcode: z.string().optional(),
  defaultSalesPriceCents: z.number().int().nonnegative().optional(),
  defaultPurchaseCostCents: z.number().int().nonnegative().optional(),
  isActive: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
  idempotencyKey: z.string().optional(),
});

export const CreateProductOutputSchema = z.object({
  product: ProductDtoSchema,
});

export type CreateProductInput = z.infer<typeof CreateProductInputSchema>;
export type CreateProductOutput = z.infer<typeof CreateProductOutputSchema>;
