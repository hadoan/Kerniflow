import { z } from "zod";
import { EntryStatusSchema } from "./enums";
import { JournalEntryDtoSchema } from "./journal-entry.types";

export const ListJournalEntriesInputSchema = z.object({
  status: EntryStatusSchema.optional(),
  fromDate: z.string().optional(), // LocalDate YYYY-MM-DD
  toDate: z.string().optional(), // LocalDate YYYY-MM-DD
  accountId: z.string().optional(),
  search: z.string().optional(),
  limit: z.number().int().positive().default(50),
  cursor: z.string().optional(),
});

export type ListJournalEntriesInput = z.infer<typeof ListJournalEntriesInputSchema>;

export const ListJournalEntriesOutputSchema = z.object({
  entries: z.array(JournalEntryDtoSchema),
  nextCursor: z.string().nullable(),
  total: z.number().int().nonnegative(),
});

export type ListJournalEntriesOutput = z.infer<typeof ListJournalEntriesOutputSchema>;
