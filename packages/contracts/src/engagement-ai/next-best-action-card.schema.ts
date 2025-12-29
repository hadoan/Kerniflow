import { z } from "zod";
import { utcInstantSchema } from "../shared/local-date.schema";

export const NextBestActionTypeSchema = z.enum([
  "OFFER_REWARD",
  "ATTACH_TO_SALE",
  "ADD_NOTE",
  "WELCOME_VIP",
]);
export type NextBestActionType = z.infer<typeof NextBestActionTypeSchema>;

export const NextBestActionSchema = z.object({
  type: NextBestActionTypeSchema,
  label: z.string(),
  note: z.string().optional().nullable(),
});

export const NextBestActionCardSchema = z.object({
  ok: z.boolean(),
  actions: z.array(NextBestActionSchema),
  confidence: z.number().min(0).max(1),
  rationale: z.string(),
});

export const EngagementLoyaltyNextBestActionInputSchema = z.object({
  customerPartyId: z.string().uuid(),
  pointsBalance: z.number().int().optional(),
  lastVisitAt: utcInstantSchema.optional().nullable(),
  recentCheckIns: z
    .array(
      z.object({
        checkInEventId: z.string().uuid(),
        checkedInAt: utcInstantSchema,
      })
    )
    .optional(),
  salesContext: z
    .object({
      hasOpenTicket: z.boolean().optional(),
    })
    .optional(),
});

export type NextBestAction = z.infer<typeof NextBestActionSchema>;
export type NextBestActionCard = z.infer<typeof NextBestActionCardSchema>;
export type EngagementLoyaltyNextBestActionInput = z.infer<
  typeof EngagementLoyaltyNextBestActionInputSchema
>;
