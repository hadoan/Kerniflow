import { z } from "zod";

/**
 * Upsell suggestion item schema
 */
export const UpsellSuggestionSchema = z.object({
  productId: z.string().uuid(),
  productName: z.string(),
  sku: z.string(),
  priceCents: z.number().int().nonnegative(),
  reason: z.string(),
  confidence: z.number().min(0).max(1),
  expectedUpliftCents: z.number().int().nonnegative().nullable(),
});

export type UpsellSuggestion = z.infer<typeof UpsellSuggestionSchema>;

/**
 * Upsell card - returned by pos_upsellSuggestions AI tool
 */
export const UpsellCardSchema = z.object({
  ok: z.boolean(),
  suggestions: z.array(UpsellSuggestionSchema),
  confidence: z.number().min(0).max(1),
  rationale: z.string(),
  provenance: z.object({
    cartContext: z.string(),
    customerHistoryUsed: z.boolean(),
  }),
});

export type UpsellCard = z.infer<typeof UpsellCardSchema>;

/**
 * Tool input: pos_upsellSuggestions
 */
export const PosUpsellSuggestionsInputSchema = z.object({
  cartLineItems: z.array(
    z.object({
      productId: z.string().uuid(),
      quantity: z.number().int().positive(),
    })
  ),
  customerPartyId: z.string().uuid().optional(),
  limit: z.number().int().positive().max(5).default(3),
});

export type PosUpsellSuggestionsInput = z.infer<typeof PosUpsellSuggestionsInputSchema>;
