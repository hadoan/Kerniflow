import { z } from "zod";

/**
 * Cart proposal line item schema
 */
export const CartProposalLineSchema = z.object({
  productId: z.string().uuid(),
  productName: z.string(),
  sku: z.string(),
  quantity: z.number().int().positive(),
  unitPriceCents: z.number().int().nonnegative(),
  confidence: z.number().min(0).max(1),
});

export type CartProposalLine = z.infer<typeof CartProposalLineSchema>;

/**
 * Cart proposal card - returned by pos_buildCartFromText AI tool
 */
export const CartProposalCardSchema = z.object({
  ok: z.boolean(),
  proposal: z.object({
    lineItems: z.array(CartProposalLineSchema),
    customerPartyId: z.string().uuid().nullable(),
    customerName: z.string().nullable(),
  }),
  confidence: z.number().min(0).max(1),
  rationale: z.string(),
  provenance: z.object({
    sourceText: z.string(),
    extractedEntities: z.array(z.string()),
  }),
});

export type CartProposalCard = z.infer<typeof CartProposalCardSchema>;

/**
 * Tool input: pos_buildCartFromText
 */
export const PosBuildCartFromTextInputSchema = z.object({
  userText: z.string().min(1).max(500),
  warehouseId: z.string().uuid().optional(),
});

export type PosBuildCartFromTextInput = z.infer<typeof PosBuildCartFromTextInputSchema>;
