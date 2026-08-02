import { z } from "zod";
import { DayKeySchema, MonthKeySchema } from "./schema";

export const CashDashboardDayStatusSchema = z.enum([
  "open",
  "needs-review",
  "ready-to-close",
  "closed",
]);
export type CashDashboardDayStatus = z.infer<typeof CashDashboardDayStatusSchema>;
export const CashDashboardExportStatusSchema = z.enum([
  "ready",
  "blocked-receipts",
  "blocked-open-days",
  "blocked-review",
  "exported",
]);
export type CashDashboardExportStatus = z.infer<typeof CashDashboardExportStatusSchema>;
export const CashDashboardEntryTypeSchema = z.enum([
  "income",
  "expense",
  "private-deposit",
  "private-withdrawal",
]);
export type CashDashboardEntryType = z.infer<typeof CashDashboardEntryTypeSchema>;
export const CashDashboardEntrySchema = z.object({
  id: z.string(),
  occurredAt: z.string(),
  type: CashDashboardEntryTypeSchema,
  amountCents: z.number().int().nonnegative(),
  note: z.string(),
  hasReceipt: z.boolean(),
  receiptRequired: z.boolean(),
  needsReview: z.boolean(),
  missingNote: z.boolean(),
  canReverse: z.boolean(),
});
export type CashDashboardEntry = z.infer<typeof CashDashboardEntrySchema>;
export const GetCashDashboardQuerySchema = z.object({
  registerId: z.string(),
  dayKey: DayKeySchema.optional(),
});
export type GetCashDashboardQuery = z.infer<typeof GetCashDashboardQuerySchema>;
export const CashDashboardResponseSchema = z.object({
  registerId: z.string(),
  salonName: z.string(),
  location: z.string().nullable().optional(),
  currency: z.string().length(3),
  dayKey: DayKeySchema,
  monthKey: MonthKeySchema,
  summary: z.object({
    openingBalanceCents: z.number().int(),
    cashIncomeTodayCents: z.number().int().nonnegative(),
    cashExpensesTodayCents: z.number().int().nonnegative(),
    privateDepositsCents: z.number().int().nonnegative(),
    privateWithdrawalsCents: z.number().int().nonnegative(),
    expectedClosingCents: z.number().int(),
    countedCashCents: z.number().int().nullable().optional(),
    differenceCents: z.number().int().nullable().optional(),
  }),
  status: z.object({
    dayStatus: CashDashboardDayStatusSchema,
    missingReceiptsToday: z.number().int().nonnegative(),
    missingReceiptsThisMonth: z.number().int().nonnegative(),
    receiptsAttachedToday: z.number().int().nonnegative(),
    reviewItemsCount: z.number().int().nonnegative(),
    suspiciousEntriesCount: z.number().int().nonnegative(),
    missingNotesCount: z.number().int().nonnegative(),
    openDaysThisWeek: z.number().int().nonnegative(),
    openDaysThisMonth: z.number().int().nonnegative(),
    receiptCompletionPercent: z.number().int().min(0).max(100),
    exportStatus: CashDashboardExportStatusSchema,
    exportAlreadyGenerated: z.boolean(),
  }),
  closing: z.object({
    isClosed: z.boolean(),
    countedCashEntered: z.boolean(),
    lastClosedDate: DayKeySchema.nullable().optional(),
    lastClosedBy: z.string().nullable().optional(),
    responsiblePerson: z.string().nullable().optional(),
  }),
  export: z.object({
    lastExportDate: z.string().nullable().optional(),
    monthEntriesCompleted: z.number().int().nonnegative(),
    monthEntriesTotal: z.number().int().nonnegative(),
    checklist: z.object({
      daysClosed: z.boolean(),
      receiptsComplete: z.boolean(),
      reviewQueueClear: z.boolean(),
    }),
  }),
  trend: z.object({
    weekIncomeCents: z.number().int(),
    weekExpensesCents: z.number().int(),
    openDaysCount: z.number().int().nonnegative(),
    missingReceiptsCount: z.number().int().nonnegative(),
    monthCashTotalCents: z.number().int(),
    lastMonthCashTotalCents: z.number().int(),
  }),
  recentEntries: z.array(CashDashboardEntrySchema),
});
export type CashDashboardResponse = z.infer<typeof CashDashboardResponseSchema>;
