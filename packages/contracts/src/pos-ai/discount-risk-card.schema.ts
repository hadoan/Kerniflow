import { z } from "zod";

/**
 * Discount risk level enum
 */
export const DiscountRiskLevel = {
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
} as const;

export const DiscountRiskLevelSchema = z.enum(["LOW", "MEDIUM", "HIGH"]);

/**
 * Discount risk card - returned by pos_discountGuard AI tool
 */
export const DiscountRiskCardSchema = z.object({
  ok: z.boolean(),
  riskLevel: DiscountRiskLevelSchema,
  discountPercentage: z.number().min(0).max(100),
  requiresApproval: z.boolean(),
  reasons: z.array(z.string()),
  policy: z.object({
    maxAllowedPercentage: z.number().min(0).max(100),
    approvalThreshold: z.number().min(0).max(100),
  }),
  confidence: z.number().min(0).max(1),
  rationale: z.string(),
});

export type DiscountRiskCard = z.infer<typeof DiscountRiskCardSchema>;

/**
 * Tool input: pos_discountGuard
 */
export const PosDiscountGuardInputSchema = z.object({
  discountCents: z.number().int().nonnegative(),
  lineItemTotalCents: z.number().int().positive(),
  productId: z.string().uuid().optional(),
  cashierEmployeePartyId: z.string().uuid().optional(),
});

export type PosDiscountGuardInput = z.infer<typeof PosDiscountGuardInputSchema>;
