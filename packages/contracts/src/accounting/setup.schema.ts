import { z } from "zod";
import { AccountingSettingsDtoSchema } from "./accounting-settings.types";
import { AccountingPeriodDtoSchema } from "./accounting-period.types";
import { LedgerAccountDtoSchema } from "./ledger-account.types";

// Setup Status
export const SetupStatusOutputSchema = z.object({
  isSetup: z.boolean(),
  settings: AccountingSettingsDtoSchema.nullable(),
});

export type SetupStatusOutput = z.infer<typeof SetupStatusOutputSchema>;

// Setup Input
export const SetupAccountingInputSchema = z.object({
  baseCurrency: z.string(),
  fiscalYearStartMonthDay: z.string(), // Format: "MM-DD" e.g., "01-01"
  periodLockingEnabled: z.boolean().default(false),
  entryNumberPrefix: z.string().default("JE"),
  template: z.enum(["minimal", "freelancer", "smallBusiness", "standard"]).default("standard"),
  idempotencyKey: z.string().optional(),
});

export type SetupAccountingInput = z.infer<typeof SetupAccountingInputSchema>;

// Setup Output
export const SetupAccountingOutputSchema = z.object({
  settings: AccountingSettingsDtoSchema,
  periods: z.array(AccountingPeriodDtoSchema),
  accounts: z.array(LedgerAccountDtoSchema),
});

export type SetupAccountingOutput = z.infer<typeof SetupAccountingOutputSchema>;
