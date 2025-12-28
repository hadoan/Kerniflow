import { z } from "zod";
import { EntryStatusSchema, LineDirectionSchema, SourceTypeSchema } from "./enums";

export const JournalLineDtoSchema = z.object({
  id: z.string(),
  ledgerAccountId: z.string(),
  ledgerAccountCode: z.string().optional(),
  ledgerAccountName: z.string().optional(),
  direction: LineDirectionSchema,
  amountCents: z.number().int().positive(),
  currency: z.string(),
  lineMemo: z.string().nullable(),
  reference: z.string().nullable(),
  tags: z.array(z.string()).nullable(),
});

export type JournalLineDto = z.infer<typeof JournalLineDtoSchema>;

export const JournalEntryDtoSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  entryNumber: z.string().nullable(),
  status: EntryStatusSchema,
  postingDate: z.string(), // LocalDate YYYY-MM-DD
  memo: z.string(),
  sourceType: SourceTypeSchema.nullable(),
  sourceId: z.string().nullable(),
  sourceRef: z.string().nullable(),
  lines: z.array(JournalLineDtoSchema),
  reversesEntryId: z.string().nullable(),
  reversedByEntryId: z.string().nullable(),
  createdBy: z.string(),
  createdAt: z.string(),
  postedBy: z.string().nullable(),
  postedAt: z.string().nullable(),
  updatedAt: z.string(),
});

export type JournalEntryDto = z.infer<typeof JournalEntryDtoSchema>;

// Input schemas for lines
export const JournalLineInputSchema = z.object({
  ledgerAccountId: z.string(),
  direction: LineDirectionSchema,
  amountCents: z.number().int().positive(),
  currency: z.string(),
  lineMemo: z.string().optional(),
  reference: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export type JournalLineInput = z.infer<typeof JournalLineInputSchema>;
