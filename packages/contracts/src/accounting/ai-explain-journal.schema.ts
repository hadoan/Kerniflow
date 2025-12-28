import { z } from "zod";
import { ConfidenceLevelSchema } from "./enums";
import { JournalEntryDtoSchema } from "./journal-entry.types";
import { ProvenanceSummarySchema } from "./ai-interaction.types";

export const ExplainJournalEntryInputSchema = z
  .object({
    journalEntryId: z.string().optional(),
    draftEntry: JournalEntryDtoSchema.optional(),
    userQuestion: z.string().optional(),
    idempotencyKey: z.string().optional(),
  })
  .refine((data) => data.journalEntryId || data.draftEntry, {
    message: "Either journalEntryId or draftEntry must be provided",
  });

export type ExplainJournalEntryInput = z.infer<typeof ExplainJournalEntryInputSchema>;

export const ExplainJournalEntryOutputSchema = z.object({
  explanation: z.string(),
  highlightLines: z.array(
    z.object({
      lineIndex: z.number().int().nonnegative(),
      lineId: z.string().optional(),
      snippet: z.string(),
    })
  ),
  warnings: z.array(
    z.object({
      severity: z.enum(["info", "warn", "high"]),
      message: z.string(),
      lineIndex: z.number().int().nonnegative().optional(),
    })
  ),
  confidence: ConfidenceLevelSchema,
  provenance: ProvenanceSummarySchema,
  aiInteractionId: z.string(),
});

export type ExplainJournalEntryOutput = z.infer<typeof ExplainJournalEntryOutputSchema>;
