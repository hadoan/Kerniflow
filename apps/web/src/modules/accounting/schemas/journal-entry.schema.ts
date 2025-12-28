import { z } from "zod";
import { LineDirectionSchema } from "@kerniflow/contracts";

/**
 * Frontend form schema for journal entry lines
 */
export const journalLineFormSchema = z.object({
  ledgerAccountId: z.string().min(1, "Account is required"),
  direction: LineDirectionSchema,
  amountCents: z.number().int().positive("Amount must be positive"),
  currency: z.string(),
  lineMemo: z.string().nullable().optional(),
});

/**
 * Frontend form schema for creating/editing journal entries
 */
export const journalEntryFormSchema = z.object({
  postingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  memo: z.string().min(1, "Memo is required").max(500),
  lines: z
    .array(journalLineFormSchema)
    .min(2, "At least 2 lines are required")
    .refine(
      (lines) => {
        // Validate balance
        const totalDebits = lines
          .filter((l) => l.direction === "Debit")
          .reduce((sum, l) => sum + l.amountCents, 0);
        const totalCredits = lines
          .filter((l) => l.direction === "Credit")
          .reduce((sum, l) => sum + l.amountCents, 0);
        return totalDebits === totalCredits;
      },
      {
        message: "Debits must equal credits",
      }
    ),
});

export type JournalEntryFormData = z.infer<typeof journalEntryFormSchema>;
