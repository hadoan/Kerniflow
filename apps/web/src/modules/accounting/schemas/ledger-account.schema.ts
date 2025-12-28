import { z } from "zod";
import { AccountTypeSchema } from "@kerniflow/contracts";

/**
 * Frontend form schema for creating/editing ledger accounts
 */
export const ledgerAccountFormSchema = z.object({
  code: z
    .string()
    .min(1, "Account code is required")
    .max(20, "Code must be 20 characters or less")
    .regex(/^[A-Z0-9-]+$/, "Code must contain only uppercase letters, numbers, and hyphens"),
  name: z
    .string()
    .min(1, "Account name is required")
    .max(100, "Name must be 100 characters or less"),
  type: AccountTypeSchema,
  description: z.string().max(500).optional().nullable(),
  isActive: z.boolean().default(true),
});

export type LedgerAccountFormData = z.infer<typeof ledgerAccountFormSchema>;
