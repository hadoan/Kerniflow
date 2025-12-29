import { z } from "zod";

/**
 * Product match item schema
 */
export const ProductMatchSchema = z.object({
  productId: z.string().uuid(),
  productName: z.string(),
  sku: z.string(),
  barcode: z.string().nullable(),
  priceCents: z.number().int().nonnegative(),
  availableQty: z.number().int().nullable(),
  confidence: z.number().min(0).max(1),
});

export type ProductMatch = z.infer<typeof ProductMatchSchema>;

/**
 * Product match card - returned by pos_findProduct AI tool
 */
export const ProductMatchCardSchema = z.object({
  ok: z.boolean(),
  matches: z.array(ProductMatchSchema),
  confidence: z.number().min(0).max(1),
  rationale: z.string(),
  provenance: z.object({
    searchText: z.string(),
    matchedFields: z.array(z.string()),
  }),
});

export type ProductMatchCard = z.infer<typeof ProductMatchCardSchema>;

/**
 * Tool input: pos_findProduct
 */
export const PosFindProductInputSchema = z.object({
  searchText: z.string().min(1).max(200),
  warehouseId: z.string().uuid().optional(),
  limit: z.number().int().positive().max(10).default(3),
});

export type PosFindProductInput = z.infer<typeof PosFindProductInputSchema>;
