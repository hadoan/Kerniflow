import { z } from "zod";
import { LoyaltyLedgerEntrySchema, LoyaltyReasonCodeSchema } from "./loyalty-ledger-entry.types";

export const CreateLoyaltyEarnEntryInputSchema = z.object({
  entryId: z.string().uuid(),
  customerPartyId: z.string().uuid(),
  pointsDelta: z.number().int().positive(),
  reasonCode: LoyaltyReasonCodeSchema,
  sourceType: z.string().optional().nullable(),
  sourceId: z.string().optional().nullable(),
  createdByEmployeePartyId: z.string().uuid().optional().nullable(),
});

export const CreateLoyaltyEarnEntryOutputSchema = z.object({
  entry: LoyaltyLedgerEntrySchema,
});

export type CreateLoyaltyEarnEntryInput = z.infer<typeof CreateLoyaltyEarnEntryInputSchema>;
export type CreateLoyaltyEarnEntryOutput = z.infer<typeof CreateLoyaltyEarnEntryOutputSchema>;
