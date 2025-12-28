import { z } from "zod";
import { AccountTypeSchema } from "./enums";
import { LedgerAccountDtoSchema } from "./ledger-account.types";

export const ListLedgerAccountsInputSchema = z.object({
  type: AccountTypeSchema.optional(),
  isActive: z.boolean().optional(),
  search: z.string().optional(),
  limit: z.number().int().positive().default(100),
  cursor: z.string().optional(),
});

export type ListLedgerAccountsInput = z.infer<typeof ListLedgerAccountsInputSchema>;

export const ListLedgerAccountsOutputSchema = z.object({
  accounts: z.array(LedgerAccountDtoSchema),
  nextCursor: z.string().nullable(),
  total: z.number().int().nonnegative(),
});

export type ListLedgerAccountsOutput = z.infer<typeof ListLedgerAccountsOutputSchema>;
