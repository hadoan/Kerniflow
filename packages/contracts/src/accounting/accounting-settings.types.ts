import { z } from "zod";

export const AccountingSettingsDtoSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  baseCurrency: z.string(),
  fiscalYearStartMonthDay: z.string(), // Format: "MM-DD" e.g., "01-01" for January 1
  periodLockingEnabled: z.boolean(),
  entryNumberPrefix: z.string(),
  nextEntryNumber: z.number().int().positive(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type AccountingSettingsDto = z.infer<typeof AccountingSettingsDtoSchema>;
