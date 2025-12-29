import { z } from "zod";

export const LoyaltyExplanationCardSchema = z.object({
  ok: z.boolean(),
  summary: z.string(),
  howToEarn: z.array(z.string()).optional(),
  rewardsAvailable: z.array(z.string()).optional(),
  confidence: z.number().min(0).max(1),
  rationale: z.string(),
});

export const EngagementExplainLoyaltyInputSchema = z.object({
  customerPartyId: z.string().uuid(),
  pointsBalance: z.number().int().optional(),
  pointsPerVisit: z.number().int().optional(),
  rewardLabels: z.array(z.string()).optional(),
});

export type LoyaltyExplanationCard = z.infer<typeof LoyaltyExplanationCardSchema>;
export type EngagementExplainLoyaltyInput = z.infer<typeof EngagementExplainLoyaltyInputSchema>;
