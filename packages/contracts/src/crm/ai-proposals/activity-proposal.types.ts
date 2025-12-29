import { z } from "zod";
import { ActivityTypeSchema } from "../activity.types";
import { ProvenanceSchema } from "./party-proposal.types";

export const ActivityProposalSchema = z.object({
  type: ActivityTypeSchema,
  subject: z.string(),
  body: z.string().optional(),
  dueAt: z.string().optional(), // ISO timestamp
  assignedToUserId: z.string().optional(),
});

export type ActivityProposal = z.infer<typeof ActivityProposalSchema>;

export const ActivityProposalCardSchema = z.object({
  ok: z.literal(true),
  proposals: z.array(ActivityProposalSchema), // Multiple activities proposed
  emailDraft: z
    .object({
      subject: z.string(),
      body: z.string(),
    })
    .optional(),
  confidence: z.number().min(0).max(1),
  rationale: z.string(),
  provenance: ProvenanceSchema,
});

export type ActivityProposalCard = z.infer<typeof ActivityProposalCardSchema>;

// Stalled deals detection result
export const StalledDealSchema = z.object({
  dealId: z.string(),
  title: z.string(),
  partyName: z.string(),
  stageId: z.string(),
  daysStalled: z.number().int(),
  reason: z.string(),
  suggestedActions: z.array(z.string()),
});

export type StalledDeal = z.infer<typeof StalledDealSchema>;

export const StalledDealsCardSchema = z.object({
  ok: z.literal(true),
  stalledDeals: z.array(StalledDealSchema),
  confidence: z.number().min(0).max(1),
  rationale: z.string(),
  provenance: ProvenanceSchema,
});

export type StalledDealsCard = z.infer<typeof StalledDealsCardSchema>;

// Weekly pipeline digest
export const PipelineDigestSchema = z.object({
  totalDeals: z.number().int(),
  totalValue: z.number().int(), // in cents
  dealsByStage: z.record(z.number().int()),
  topPriorities: z.array(
    z.object({
      dealId: z.string(),
      title: z.string(),
      reason: z.string(),
      action: z.string(),
    })
  ),
  weeklyWins: z.number().int(),
  weeklyLosses: z.number().int(),
  narrative: z.string(), // AI-generated summary
});

export type PipelineDigest = z.infer<typeof PipelineDigestSchema>;

export const PipelineDigestCardSchema = z.object({
  ok: z.literal(true),
  digest: PipelineDigestSchema,
  confidence: z.number().min(0).max(1),
  rationale: z.string(),
  provenance: ProvenanceSchema,
});

export type PipelineDigestCard = z.infer<typeof PipelineDigestCardSchema>;
