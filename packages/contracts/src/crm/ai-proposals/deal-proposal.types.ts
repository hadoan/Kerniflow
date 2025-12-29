import { z } from "zod";
import { ProvenanceSchema } from "./party-proposal.types";

export const DealProposalSchema = z.object({
  title: z.string(),
  partyId: z.string().optional(), // If AI can match to existing party
  partyName: z.string().optional(), // If no match, suggest creating party
  stageId: z.string(),
  amountCents: z.number().int().optional(),
  currency: z.string(),
  expectedCloseDate: z.string().optional(),
  probability: z.number().int().min(0).max(100).optional(),
  ownerUserId: z.string().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export type DealProposal = z.infer<typeof DealProposalSchema>;

export const DealProposalCardSchema = z.object({
  ok: z.literal(true),
  proposal: DealProposalSchema,
  confidence: z.number().min(0).max(1),
  rationale: z.string(),
  provenance: ProvenanceSchema,
});

export type DealProposalCard = z.infer<typeof DealProposalCardSchema>;

// Deal summary card (for AI_SummarizeDeal tool)
export const DealSummarySchema = z.object({
  dealId: z.string(),
  currentStage: z.string(),
  daysInStage: z.number().int(),
  lastActivityDate: z.string().nullable(),
  nextBestActions: z.array(z.string()),
  riskFlags: z.array(
    z.object({
      type: z.string(),
      severity: z.enum(["low", "medium", "high"]),
      description: z.string(),
    })
  ),
  suggestedTasks: z.array(
    z.object({
      subject: z.string(),
      type: z.enum(["NOTE", "TASK", "CALL", "MEETING", "EMAIL_DRAFT"]),
      dueAt: z.string().optional(),
    })
  ),
});

export type DealSummary = z.infer<typeof DealSummarySchema>;

export const DealSummaryCardSchema = z.object({
  ok: z.literal(true),
  summary: DealSummarySchema,
  confidence: z.number().min(0).max(1),
  rationale: z.string(),
  provenance: ProvenanceSchema,
});

export type DealSummaryCard = z.infer<typeof DealSummaryCardSchema>;
