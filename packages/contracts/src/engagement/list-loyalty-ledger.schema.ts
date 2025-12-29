import { z } from "zod";
import { LoyaltyLedgerEntrySchema } from "./loyalty-ledger-entry.types";

export const ListLoyaltyLedgerInputSchema = z.object({
  customerPartyId: z.string().uuid(),
  cursor: z.string().optional(),
  pageSize: z.number().int().positive().max(200).optional(),
});

export const ListLoyaltyLedgerOutputSchema = z.object({
  items: z.array(LoyaltyLedgerEntrySchema),
  nextCursor: z.string().nullable().optional(),
});

export type ListLoyaltyLedgerInput = z.infer<typeof ListLoyaltyLedgerInputSchema>;
export type ListLoyaltyLedgerOutput = z.infer<typeof ListLoyaltyLedgerOutputSchema>;
