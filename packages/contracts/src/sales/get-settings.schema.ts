import { z } from "zod";
import { SalesSettingsDtoSchema } from "./settings.types";

export const GetSalesSettingsInputSchema = z.object({});

export const GetSalesSettingsOutputSchema = z.object({
  settings: SalesSettingsDtoSchema,
});

export type GetSalesSettingsInput = z.infer<typeof GetSalesSettingsInputSchema>;
export type GetSalesSettingsOutput = z.infer<typeof GetSalesSettingsOutputSchema>;
