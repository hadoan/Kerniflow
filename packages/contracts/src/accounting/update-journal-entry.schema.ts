import { z } from "zod";
import { JournalLineInputSchema } from "./journal-entry.types";
import { JournalEntryDtoSchema } from "./journal-entry.types";

export const UpdateJournalEntryInputSchema = z.object({
  entryId: z.string(),
  postingDate: z.string().optional(), // LocalDate YYYY-MM-DD
  memo: z.string().min(1).max(500).optional(),
  lines: z.array(JournalLineInputSchema).min(2).optional(),
});

export type UpdateJournalEntryInput = z.infer<typeof UpdateJournalEntryInputSchema>;

export const UpdateJournalEntryOutputSchema = z.object({
  entry: JournalEntryDtoSchema,
});

export type UpdateJournalEntryOutput = z.infer<typeof UpdateJournalEntryOutputSchema>;
