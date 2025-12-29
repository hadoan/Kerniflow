import { z } from "zod";
import { utcInstantSchema } from "../shared/local-date.schema";

export const EngagementCustomerMatchSchema = z.object({
  customerPartyId: z.string().uuid(),
  displayName: z.string(),
  phone: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  lastVisitAt: utcInstantSchema.optional().nullable(),
  confidence: z.number().min(0).max(1),
});

export const CustomerMatchCardSchema = z.object({
  ok: z.boolean(),
  matches: z.array(EngagementCustomerMatchSchema),
  confidence: z.number().min(0).max(1),
  rationale: z.string(),
  provenance: z.object({
    searchText: z.string(),
    matchedFields: z.array(z.string()),
  }),
});

export const EngagementFindCustomerInputSchema = z.object({
  searchText: z.string().min(1).max(200),
  limit: z.number().int().positive().max(10).default(3),
});

export type EngagementCustomerMatch = z.infer<typeof EngagementCustomerMatchSchema>;
export type CustomerMatchCard = z.infer<typeof CustomerMatchCardSchema>;
export type EngagementFindCustomerInput = z.infer<typeof EngagementFindCustomerInputSchema>;
