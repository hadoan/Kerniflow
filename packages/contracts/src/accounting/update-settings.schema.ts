import { z } from "zod";
import { AccountingSettingsDtoSchema } from "./accounting-settings.types";

export const UpdateAccountingSettingsInputSchema = z.object({
  periodLockingEnabled: z.boolean().optional(),
  entryNumberPrefix: z.string().optional(),
});

export type UpdateAccountingSettingsInput = z.infer<typeof UpdateAccountingSettingsInputSchema>;

export const UpdateAccountingSettingsOutputSchema = z.object({
  settings: AccountingSettingsDtoSchema,
});

export type UpdateAccountingSettingsOutput = z.infer<typeof UpdateAccountingSettingsOutputSchema>;
