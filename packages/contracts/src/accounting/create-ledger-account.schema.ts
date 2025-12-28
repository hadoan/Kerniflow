import { z } from "zod";
import { AccountTypeSchema } from "./enums";
import { LedgerAccountDtoSchema } from "./ledger-account.types";

export const CreateLedgerAccountInputSchema = z.object({
  code: z.string().min(1).max(50),
  name: z.string().min(1).max(255),
  type: AccountTypeSchema,
  description: z.string().max(1000).optional(),
  systemAccountKey: z.string().optional(),
  isActive: z.boolean().default(true),
  idempotencyKey: z.string().optional(),
});

export type CreateLedgerAccountInput = z.infer<typeof CreateLedgerAccountInputSchema>;

export const CreateLedgerAccountOutputSchema = z.object({
  account: LedgerAccountDtoSchema,
});

export type CreateLedgerAccountOutput = z.infer<typeof CreateLedgerAccountOutputSchema>;
