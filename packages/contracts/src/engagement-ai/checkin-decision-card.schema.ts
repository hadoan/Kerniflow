import { z } from "zod";
import { utcInstantSchema } from "../shared/local-date.schema";

export const RecentCheckInSchema = z.object({
  checkInEventId: z.string().uuid(),
  checkedInAt: utcInstantSchema,
  status: z.string(),
});

export const CheckInDecisionSchema = z.enum(["PROCEED", "POSSIBLE_DUPLICATE", "ASK_CONFIRMATION"]);
export type CheckInDecision = z.infer<typeof CheckInDecisionSchema>;

export const CheckInDecisionCardSchema = z.object({
  ok: z.boolean(),
  decision: CheckInDecisionSchema,
  confidence: z.number().min(0).max(1),
  rationale: z.string(),
  suggestedAction: z.string().optional().nullable(),
  recentCheckIns: z.array(RecentCheckInSchema).optional(),
});

export const EngagementCheckInAssistantInputSchema = z.object({
  customerPartyId: z.string().uuid(),
  duplicateWindowMinutes: z.number().int().positive(),
  recentCheckIns: z.array(RecentCheckInSchema).optional(),
  kioskContext: z
    .object({
      registerId: z.string().uuid().optional(),
      isStaffAssisted: z.boolean().optional(),
    })
    .optional(),
});

export type CheckInDecisionCard = z.infer<typeof CheckInDecisionCardSchema>;
export type EngagementCheckInAssistantInput = z.infer<typeof EngagementCheckInAssistantInputSchema>;
