import { z } from "zod";
import { EngagementSettingsSchema, RewardRuleSchema } from "./engagement-settings.types";

export const UpdateEngagementSettingsInputSchema = z.object({
  checkInModeEnabled: z.boolean().optional(),
  checkInDuplicateWindowMinutes: z.number().int().positive().optional(),
  loyaltyEnabled: z.boolean().optional(),
  pointsPerVisit: z.number().int().nonnegative().optional(),
  rewardRules: z.array(RewardRuleSchema).optional(),
  aiEnabled: z.boolean().optional(),
  kioskBranding: z
    .object({
      logoUrl: z.string().url().optional().nullable(),
      welcomeMessage: z.string().max(200).optional().nullable(),
    })
    .optional()
    .nullable(),
});

export const UpdateEngagementSettingsOutputSchema = z.object({
  settings: EngagementSettingsSchema,
});

export type UpdateEngagementSettingsInput = z.infer<typeof UpdateEngagementSettingsInputSchema>;
export type UpdateEngagementSettingsOutput = z.infer<typeof UpdateEngagementSettingsOutputSchema>;
