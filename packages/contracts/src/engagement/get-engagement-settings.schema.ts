import { z } from "zod";
import { EngagementSettingsSchema } from "./engagement-settings.types";

export const GetEngagementSettingsInputSchema = z.object({});

export const GetEngagementSettingsOutputSchema = z.object({
  settings: EngagementSettingsSchema,
});

export type GetEngagementSettingsInput = z.infer<typeof GetEngagementSettingsInputSchema>;
export type GetEngagementSettingsOutput = z.infer<typeof GetEngagementSettingsOutputSchema>;
