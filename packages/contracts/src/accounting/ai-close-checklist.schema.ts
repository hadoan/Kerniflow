import { z } from "zod";
import { ConfidenceLevelSchema } from "./enums";
import { ProvenanceSummarySchema } from "./ai-interaction.types";

export const CloseChecklistInputSchema = z
  .object({
    periodId: z.string().optional(),
    fromDate: z.string().optional(), // LocalDate YYYY-MM-DD
    toDate: z.string().optional(), // LocalDate YYYY-MM-DD
    idempotencyKey: z.string().optional(),
  })
  .refine((data) => data.periodId || (data.fromDate && data.toDate), {
    message: "Either periodId or both fromDate and toDate must be provided",
  });

export type CloseChecklistInput = z.infer<typeof CloseChecklistInputSchema>;

export const ChecklistItemStatusSchema = z.enum(["todo", "needsReview", "ok", "blocked"]);

export type ChecklistItemStatus = z.infer<typeof ChecklistItemStatusSchema>;

export const ChecklistItemDtoSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  status: ChecklistItemStatusSchema,
  linkTo: z.string().optional(), // Route or URL
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  estimatedMinutes: z.number().int().positive().optional(),
});

export type ChecklistItemDto = z.infer<typeof ChecklistItemDtoSchema>;

export const BlockingIssueDtoSchema = z.object({
  id: z.string(),
  type: z.enum([
    "unpostedDrafts",
    "periodStillOpen",
    "unbalancedEntries",
    "reportMismatch",
    "missingAccounts",
    "other",
  ]),
  description: z.string(),
  severity: z.enum(["warning", "blocker"]),
  linkTo: z.string().optional(), // Route or URL
  count: z.number().int().nonnegative().optional(),
});

export type BlockingIssueDto = z.infer<typeof BlockingIssueDtoSchema>;

export const CloseChecklistOutputSchema = z.object({
  periodId: z.string().optional(),
  fromDate: z.string(),
  toDate: z.string(),
  checklistItems: z.array(ChecklistItemDtoSchema),
  blockingIssues: z.array(BlockingIssueDtoSchema),
  summary: z.string(),
  confidence: ConfidenceLevelSchema,
  provenance: ProvenanceSummarySchema,
  aiInteractionId: z.string(),
});

export type CloseChecklistOutput = z.infer<typeof CloseChecklistOutputSchema>;
