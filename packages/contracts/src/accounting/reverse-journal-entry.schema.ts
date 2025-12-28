import { z } from "zod";
import { JournalEntryDtoSchema } from "./journal-entry.types";

export const ReverseJournalEntryInputSchema = z.object({
  entryId: z.string(),
  reversalDate: z.string(), // LocalDate YYYY-MM-DD
  reversalMemo: z.string().optional(),
  idempotencyKey: z.string().optional(),
});

export type ReverseJournalEntryInput = z.infer<typeof ReverseJournalEntryInputSchema>;

export const ReverseJournalEntryOutputSchema = z.object({
  originalEntry: JournalEntryDtoSchema,
  reversalEntry: JournalEntryDtoSchema,
});

export type ReverseJournalEntryOutput = z.infer<typeof ReverseJournalEntryOutputSchema>;
