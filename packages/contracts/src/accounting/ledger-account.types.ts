import { z } from "zod";
import { AccountTypeSchema } from "./enums";

export const LedgerAccountDtoSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  code: z.string(),
  name: z.string(),
  type: AccountTypeSchema,
  isActive: z.boolean(),
  description: z.string().nullable(),
  systemAccountKey: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type LedgerAccountDto = z.infer<typeof LedgerAccountDtoSchema>;
