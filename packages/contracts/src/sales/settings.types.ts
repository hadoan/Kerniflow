import { z } from "zod";

export const SalesSettingsDtoSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  defaultPaymentTerms: z.string().nullable().optional(),
  defaultCurrency: z.string(),
  quoteNumberPrefix: z.string(),
  quoteNextNumber: z.number().int().positive(),
  orderNumberPrefix: z.string(),
  orderNextNumber: z.number().int().positive(),
  invoiceNumberPrefix: z.string(),
  invoiceNextNumber: z.number().int().positive(),
  defaultRevenueAccountId: z.string().nullable().optional(),
  defaultAccountsReceivableAccountId: z.string().nullable().optional(),
  defaultBankAccountId: z.string().nullable().optional(),
  autoPostOnIssue: z.boolean(),
  autoPostOnPayment: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type SalesSettingsDto = z.infer<typeof SalesSettingsDtoSchema>;
