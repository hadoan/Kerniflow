import { z } from "zod";
import { AiContextTypeSchema, ConfidenceLevelSchema } from "./enums";

export const AiInteractionDtoSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  actorUserId: z.string(),
  contextType: AiContextTypeSchema,
  inputSummary: z.string(),
  outputSummary: z.string(),
  confidence: ConfidenceLevelSchema.nullable(),
  confidenceScore: z.number().min(0).max(1).nullable(),
  referencedData: z.string().nullable(), // JSON string of provenance list
  acceptedAction: z.enum(["none", "savedDraft", "appliedSuggestion", "dismissed"]).nullable(),
  createdAt: z.string(),
});

export type AiInteractionDto = z.infer<typeof AiInteractionDtoSchema>;

// Provenance structure (for referencedData JSON)
export const ProvenanceItemSchema = z.object({
  type: z.enum(["accounts", "journalEntries", "reportData", "periods", "settings"]),
  count: z.number().int().optional(),
  dateRange: z
    .object({
      from: z.string(),
      to: z.string(),
    })
    .optional(),
  description: z.string().optional(),
});

export type ProvenanceItem = z.infer<typeof ProvenanceItemSchema>;

export const ProvenanceSummarySchema = z.object({
  items: z.array(ProvenanceItemSchema),
  summary: z.string(),
});

export type ProvenanceSummary = z.infer<typeof ProvenanceSummarySchema>;
