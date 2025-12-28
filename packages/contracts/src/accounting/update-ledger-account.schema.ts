import { z } from "zod";
import { LedgerAccountDtoSchema } from "./ledger-account.types";

export const UpdateLedgerAccountInputSchema = z.object({
  accountId: z.string(),
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  isActive: z.boolean().optional(),
});

export type UpdateLedgerAccountInput = z.infer<typeof UpdateLedgerAccountInputSchema>;

export const UpdateLedgerAccountOutputSchema = z.object({
  account: LedgerAccountDtoSchema,
});

export type UpdateLedgerAccountOutput = z.infer<typeof UpdateLedgerAccountOutputSchema>;
