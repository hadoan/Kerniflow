import { z } from "zod";
import { utcInstantSchema } from "../shared/local-date.schema";

export const LoyaltyEntryTypeSchema = z.enum(["EARN", "REDEEM", "ADJUST", "EXPIRE"]);
export type LoyaltyEntryType = z.infer<typeof LoyaltyEntryTypeSchema>;

export const LoyaltyReasonCodeSchema = z.enum([
  "VISIT_CHECKIN",
  "MANUAL_ADJUSTMENT",
  "REWARD_REDEMPTION",
  "EXPIRATION",
]);
export type LoyaltyReasonCode = z.infer<typeof LoyaltyReasonCodeSchema>;

export const LoyaltyLedgerEntrySchema = z.object({
  tenantId: z.string(),
  entryId: z.string().uuid(),
  customerPartyId: z.string().uuid(),
  entryType: LoyaltyEntryTypeSchema,
  pointsDelta: z.number().int(),
  reasonCode: LoyaltyReasonCodeSchema,
  sourceType: z.string().optional().nullable(),
  sourceId: z.string().optional().nullable(),
  createdAt: utcInstantSchema,
  createdByEmployeePartyId: z.string().uuid().optional().nullable(),
});

export type LoyaltyLedgerEntry = z.infer<typeof LoyaltyLedgerEntrySchema>;
