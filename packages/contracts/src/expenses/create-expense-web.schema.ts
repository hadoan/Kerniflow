import { z } from "zod";
import { localDateSchema } from "../shared/local-date.schema";
import { ExpenseDtoSchema } from "./expense.types";

/**
 * Web-friendly expense create payload
 * Matches the web app form fields (merchantName, expenseDate, totalAmountCents)
 */
export const CreateExpenseWebInputSchema = z.object({
  merchantName: z.string(),
  expenseDate: localDateSchema,
  totalAmountCents: z.number().int().positive(),
  totalCents: z.number().int().positive().optional(), // legacy compatibility
  currency: z.string(),
  category: z.string().optional(),
  notes: z.string().optional(),
  vatRate: z.number().optional(),
  custom: z.record(z.any()).optional(),
  idempotencyKey: z.string().optional(),
  tenantId: z.string().optional(), // typically provided via headers/token
});

export type CreateExpenseWebInput = z.infer<typeof CreateExpenseWebInputSchema>;

export const CreateExpenseWebOutputSchema = z.object({
  expense: ExpenseDtoSchema,
});

export type CreateExpenseWebOutput = z.infer<typeof CreateExpenseWebOutputSchema>;
