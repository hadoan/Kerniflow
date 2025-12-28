import { z } from "zod";
import { JournalEntryDtoSchema } from "./journal-entry.types";

export const PostJournalEntryInputSchema = z.object({
  entryId: z.string(),
  idempotencyKey: z.string().optional(),
});

export type PostJournalEntryInput = z.infer<typeof PostJournalEntryInputSchema>;

export const PostJournalEntryOutputSchema = z.object({
  entry: JournalEntryDtoSchema,
});

export type PostJournalEntryOutput = z.infer<typeof PostJournalEntryOutputSchema>;
