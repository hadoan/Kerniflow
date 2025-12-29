import { z } from "zod";
import { LoyaltyLedgerEntrySchema } from "./loyalty-ledger-entry.types";

export const CreateLoyaltyAdjustEntryInputSchema = z.object({
  entryId: z.string().uuid(),
  customerPartyId: z.string().uuid(),
  pointsDelta: z.number().int(),
  reason: z.string().max(500).optional().nullable(),
  createdByEmployeePartyId: z.string().uuid(),
});

export const CreateLoyaltyAdjustEntryOutputSchema = z.object({
  entry: LoyaltyLedgerEntrySchema,
});

export type CreateLoyaltyAdjustEntryInput = z.infer<typeof CreateLoyaltyAdjustEntryInputSchema>;
export type CreateLoyaltyAdjustEntryOutput = z.infer<typeof CreateLoyaltyAdjustEntryOutputSchema>;
