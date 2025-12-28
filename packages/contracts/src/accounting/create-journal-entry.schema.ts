import { z } from "zod";
import { SourceTypeSchema } from "./enums";
import { JournalLineInputSchema } from "./journal-entry.types";
import { JournalEntryDtoSchema } from "./journal-entry.types";

export const CreateJournalEntryInputSchema = z.object({
  postingDate: z.string(), // LocalDate YYYY-MM-DD
  memo: z.string().min(1).max(500),
  lines: z.array(JournalLineInputSchema).min(2),
  sourceType: SourceTypeSchema.optional(),
  sourceId: z.string().optional(),
  sourceRef: z.string().optional(),
  idempotencyKey: z.string().optional(),
});

export type CreateJournalEntryInput = z.infer<typeof CreateJournalEntryInputSchema>;

export const CreateJournalEntryOutputSchema = z.object({
  entry: JournalEntryDtoSchema,
});

export type CreateJournalEntryOutput = z.infer<typeof CreateJournalEntryOutputSchema>;
