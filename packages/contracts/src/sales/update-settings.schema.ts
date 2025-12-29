import { z } from "zod";
import { SalesSettingsDtoSchema } from "./settings.types";

export const SalesSettingsPatchSchema = z.object({
  defaultPaymentTerms: z.string().nullable().optional(),
  defaultCurrency: z.string().optional(),
  quoteNumberPrefix: z.string().optional(),
  quoteNextNumber: z.number().int().positive().optional(),
  orderNumberPrefix: z.string().optional(),
  orderNextNumber: z.number().int().positive().optional(),
  invoiceNumberPrefix: z.string().optional(),
  invoiceNextNumber: z.number().int().positive().optional(),
  defaultRevenueAccountId: z.string().nullable().optional(),
  defaultAccountsReceivableAccountId: z.string().nullable().optional(),
  defaultBankAccountId: z.string().nullable().optional(),
  autoPostOnIssue: z.boolean().optional(),
  autoPostOnPayment: z.boolean().optional(),
});

export const UpdateSalesSettingsInputSchema = z.object({
  patch: SalesSettingsPatchSchema,
  idempotencyKey: z.string().optional(),
});

export const UpdateSalesSettingsOutputSchema = z.object({
  settings: SalesSettingsDtoSchema,
});

export type UpdateSalesSettingsInput = z.infer<typeof UpdateSalesSettingsInputSchema>;
export type UpdateSalesSettingsOutput = z.infer<typeof UpdateSalesSettingsOutputSchema>;
