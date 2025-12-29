import { z } from "zod";
import { utcInstantSchema } from "../shared/local-date.schema";

export const RewardRuleSchema = z.object({
  rewardId: z.string().uuid(),
  label: z.string(),
  pointsCost: z.number().int().positive(),
  rewardValueCents: z.number().int().nonnegative().optional().nullable(),
  active: z.boolean().default(true),
});
export type RewardRule = z.infer<typeof RewardRuleSchema>;

export const EngagementSettingsSchema = z.object({
  tenantId: z.string(),
  checkInModeEnabled: z.boolean(),
  checkInDuplicateWindowMinutes: z.number().int().positive(),
  loyaltyEnabled: z.boolean(),
  pointsPerVisit: z.number().int().nonnegative(),
  rewardRules: z.array(RewardRuleSchema).optional(),
  aiEnabled: z.boolean(),
  kioskBranding: z
    .object({
      logoUrl: z.string().url().optional().nullable(),
      welcomeMessage: z.string().max(200).optional().nullable(),
    })
    .optional()
    .nullable(),
  createdAt: utcInstantSchema,
  updatedAt: utcInstantSchema,
});

export type EngagementSettings = z.infer<typeof EngagementSettingsSchema>;
