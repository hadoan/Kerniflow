import { z } from "zod";
import {
  CashPaymentMethod,
  CashDayCloseStatus,
  CashEntryDirection,
  CashEntrySource,
  CashEntryTaxMode,
  CashEntryType,
  DailyCloseStatus,
} from "./constants";

const DayKeySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");
const MonthKeySchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Expected YYYY-MM");

const cashEntryDirectionValues = [CashEntryDirection.IN, CashEntryDirection.OUT] as const;
const cashEntryTypeValues = [
  CashEntryType.SALE_CASH,
  CashEntryType.REFUND_CASH,
  CashEntryType.EXPENSE_CASH,
  CashEntryType.OWNER_DEPOSIT,
  CashEntryType.OWNER_WITHDRAWAL,
  CashEntryType.BANK_DEPOSIT,
  CashEntryType.BANK_WITHDRAWAL,
  CashEntryType.CORRECTION,
  CashEntryType.OPENING_FLOAT,
  CashEntryType.CLOSING_ADJUSTMENT,
  CashEntryType.IN,
  CashEntryType.OUT,
] as const;
const cashEntrySourceValues = [
  CashEntrySource.MANUAL,
  CashEntrySource.SALES,
  CashEntrySource.EXPENSE,
  CashEntrySource.DIFFERENCE,
  CashEntrySource.IMPORT,
  CashEntrySource.INTEGRATION,
] as const;
const paymentMethodValues = [
  CashPaymentMethod.CASH,
  CashPaymentMethod.CARD,
  CashPaymentMethod.TRANSFER,
  CashPaymentMethod.OTHER,
] as const;
const cashEntryTaxModeValues = [
  CashEntryTaxMode.NONE,
  CashEntryTaxMode.OUTPUT_VAT,
  CashEntryTaxMode.INPUT_VAT,
] as const;
const cashDayCloseStatusValues = [
  CashDayCloseStatus.DRAFT,
  CashDayCloseStatus.SUBMITTED,
  CashDayCloseStatus.VOIDED,
] as const;

export const CashEntryDirectionSchema = z.enum(cashEntryDirectionValues);
export const KnownCashEntrySourceSchema = z.enum(cashEntrySourceValues);
export const CashEntrySourceSchema = z.union([KnownCashEntrySourceSchema, z.string().min(1)]);
export const CashEntryTypeSchema = z.enum(cashEntryTypeValues);
export const KnownCashPaymentMethodSchema = z.enum(paymentMethodValues);
export const CashPaymentMethodSchema = z.union([KnownCashPaymentMethodSchema, z.string().min(1)]);
export const CashEntryTaxModeSchema = z.enum(cashEntryTaxModeValues);
export const CashDayCloseStatusSchema = z.enum(cashDayCloseStatusValues);

export const CashEntryTaxSnapshotSchema = z.object({
  mode: CashEntryTaxModeSchema,
  taxCodeId: z.string().nullable().optional(),
  taxCode: z.string().nullable().optional(),
  taxRateBps: z.number().int().min(0).max(10000).nullable().optional(),
  taxLabel: z.string().nullable().optional(),
  grossAmountCents: z.number().int().positive(),
  netAmountCents: z.number().int().nonnegative(),
  taxAmountCents: z.number().int().nonnegative(),
});
export type CashEntryTaxSnapshot = z.infer<typeof CashEntryTaxSnapshotSchema>;

export const CashEntrySourceDocumentSchema = z.object({
  documentId: z.string().nullable().optional(),
  reference: z.string().nullable().optional(),
  kind: z.string().nullable().optional(),
});
export type CashEntrySourceDocument = z.infer<typeof CashEntrySourceDocumentSchema>;

export const CashRegisterSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  workspaceId: z.string(),
  name: z.string(),
  location: z.string().nullable().optional(),
  currency: z.string().length(3).default("EUR"),
  currentBalanceCents: z.number().int(),
  disallowNegativeBalance: z.boolean().default(false),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type CashRegister = z.infer<typeof CashRegisterSchema>;

export const CashEntrySchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  workspaceId: z.string(),
  registerId: z.string(),
  entryNo: z.number().int().nonnegative(),
  occurredAt: z.string(),
  description: z.string(),
  type: CashEntryTypeSchema,
  direction: CashEntryDirectionSchema,
  source: CashEntrySourceSchema,
  paymentMethod: CashPaymentMethodSchema.default(CashPaymentMethod.CASH),
  grossAmountCents: z.number().int().positive(),
  netAmountCents: z.number().int().nonnegative().nullable().optional(),
  taxAmountCents: z.number().int().nonnegative().nullable().optional(),
  taxMode: CashEntryTaxModeSchema.nullable().optional(),
  taxCodeId: z.string().nullable().optional(),
  taxCode: z.string().nullable().optional(),
  taxRateBps: z.number().int().min(0).max(10000).nullable().optional(),
  taxLabel: z.string().nullable().optional(),
  tax: CashEntryTaxSnapshotSchema.nullable().optional(),
  amount: z.number().int().positive(),
  currency: z.string().length(3).default("EUR"),
  dayKey: DayKeySchema,
  sourceDocumentId: z.string().nullable().optional(),
  sourceDocumentRef: z.string().nullable().optional(),
  sourceDocumentKind: z.string().nullable().optional(),
  sourceDocument: CashEntrySourceDocumentSchema.nullable().optional(),
  reversalOfEntryId: z.string().optional().nullable(),
  reversedByEntryId: z.string().optional().nullable(),
  lockedByDayCloseId: z.string().optional().nullable(),
  balanceAfterCents: z.number().int(),
  referenceId: z.string().optional().nullable(),
  createdAt: z.string(),
  createdByUserId: z.string(),

  // Legacy compatibility fields.
  amountCents: z.number().int().positive().optional(),
  sourceType: CashEntrySourceSchema.optional(),
  businessDate: DayKeySchema.optional().nullable(),
});
export type CashEntry = z.infer<typeof CashEntrySchema>;

export const CashDenominationCountSchema = z.object({
  denomination: z.number().int().nonnegative(),
  count: z.number().int().nonnegative(),
  subtotal: z.number().int().nonnegative(),
});
export type CashDenominationCount = z.infer<typeof CashDenominationCountSchema>;

export const CashDayCloseSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  workspaceId: z.string(),
  registerId: z.string(),
  dayKey: DayKeySchema,
  expectedBalance: z.number().int(),
  countedBalance: z.number().int(),
  difference: z.number().int(),
  submittedAt: z.string().optional().nullable(),
  submittedBy: z.string().optional().nullable(),
  status: CashDayCloseStatusSchema,
  note: z.string().optional().nullable(),
  lockedAt: z.string().optional().nullable(),
  lockedByUserId: z.string().optional().nullable(),
  denominationCounts: z.array(CashDenominationCountSchema).optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),

  // Legacy compatibility fields.
  businessDate: DayKeySchema.optional(),
  expectedBalanceCents: z.number().int().optional(),
  countedBalanceCents: z.number().int().optional(),
  differenceCents: z.number().int().optional(),
  closedAt: z.string().optional().nullable(),
  closedByUserId: z.string().optional().nullable(),
});
export type CashDayClose = z.infer<typeof CashDayCloseSchema>;

export const CashEntryAttachmentSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  workspaceId: z.string(),
  entryId: z.string(),
  documentId: z.string(),
  uploadedBy: z.string().optional().nullable(),
  createdAt: z.string(),
});
export type CashEntryAttachment = z.infer<typeof CashEntryAttachmentSchema>;

export const CreateCashRegisterSchema = z.object({
  tenantId: z.string().optional(),
  workspaceId: z.string().optional(),
  name: z.string().min(1),
  location: z.string().optional().nullable(),
  currency: z.string().length(3).default("EUR"),
  disallowNegativeBalance: z.boolean().optional().default(false),
  idempotencyKey: z.string().optional(),
});
export type CreateCashRegister = z.infer<typeof CreateCashRegisterSchema>;

export const UpdateCashRegisterSchema = z.object({
  name: z.string().min(1).optional(),
  location: z.string().optional().nullable(),
  disallowNegativeBalance: z.boolean().optional(),
});
export type UpdateCashRegister = z.infer<typeof UpdateCashRegisterSchema>;

export const CreateCashEntryInputSchema = z
  .object({
    tenantId: z.string().optional(),
    workspaceId: z.string().optional(),
    registerId: z.string(),
    type: z.union([CashEntryTypeSchema, CashEntryDirectionSchema]).optional(),
    direction: CashEntryDirectionSchema.optional(),
    source: CashEntrySourceSchema.optional().default(CashEntrySource.MANUAL),
    sourceType: CashEntrySourceSchema.optional(),
    description: z.string().min(1),
    paymentMethod: CashPaymentMethodSchema.optional().default(CashPaymentMethod.CASH),
    grossAmountCents: z.number().int().positive().optional(),
    amount: z.number().int().positive().optional(),
    amountCents: z.number().int().positive().optional(),
    tax: z
      .object({
        mode: CashEntryTaxModeSchema.optional(),
        taxCodeId: z.string().optional().nullable(),
      })
      .optional(),
    currency: z.string().length(3).optional().default("EUR"),
    occurredAt: z.string().optional(),
    dayKey: DayKeySchema.optional(),
    businessDate: DayKeySchema.optional(),
    sourceDocument: CashEntrySourceDocumentSchema.optional(),
    referenceId: z.string().optional().nullable(),
    reversalOfEntryId: z.string().optional().nullable(),
    idempotencyKey: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    if (
      value.grossAmountCents === undefined &&
      value.amount === undefined &&
      value.amountCents === undefined
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "grossAmountCents, amount, or amountCents is required",
        path: ["amount"],
      });
    }

    if (value.tax?.mode && value.tax.mode !== CashEntryTaxMode.NONE && !value.tax.taxCodeId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "tax.taxCodeId is required when tax mode is taxable",
        path: ["tax", "taxCodeId"],
      });
    }
  });
export type CreateCashEntryInput = z.infer<typeof CreateCashEntryInputSchema>;

export const ReverseCashEntryInputSchema = z.object({
  tenantId: z.string().optional(),
  entryId: z.string().optional(),
  originalEntryId: z.string().optional(),
  reason: z.string().min(1),
  occurredAt: z.string().optional(),
  dayKey: DayKeySchema.optional(),
  idempotencyKey: z.string().optional(),
});
export type ReverseCashEntryInput = z.infer<typeof ReverseCashEntryInputSchema>;

export const SubmitCashDayCloseInputSchema = z
  .object({
    tenantId: z.string().optional(),
    workspaceId: z.string().optional(),
    registerId: z.string(),
    dayKey: DayKeySchema.optional(),
    businessDate: DayKeySchema.optional(),
    countedBalance: z.number().int().optional(),
    countedBalanceCents: z.number().int().optional(),
    denominationCounts: z.array(CashDenominationCountSchema).default([]),
    note: z.string().optional(),
    notes: z.string().optional(),
    idempotencyKey: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    if (!value.dayKey && !value.businessDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "dayKey or businessDate is required",
        path: ["dayKey"],
      });
    }

    const hasCounted =
      value.countedBalance !== undefined || value.countedBalanceCents !== undefined;
    if (!hasCounted && value.denominationCounts.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "counted balance or denominationCounts is required",
        path: ["countedBalance"],
      });
    }
  });
export type SubmitCashDayCloseInput = z.infer<typeof SubmitCashDayCloseInputSchema>;

export const ListCashEntriesQuerySchema = z.object({
  registerId: z.string(),
  dayKeyFrom: DayKeySchema.optional(),
  dayKeyTo: DayKeySchema.optional(),
  type: CashEntryTypeSchema.optional(),
  source: CashEntrySourceSchema.optional(),
  paymentMethod: CashPaymentMethodSchema.optional(),
  q: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().optional(),
});
export type ListCashEntriesQuery = z.infer<typeof ListCashEntriesQuerySchema>;

export const ListCashRegistersQuerySchema = z.object({
  q: z.string().optional(),
  location: z.string().optional(),
  currency: z.string().length(3).optional(),
});
export type ListCashRegistersQuery = z.infer<typeof ListCashRegistersQuerySchema>;

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

export const ListCashDayClosesQuerySchema = z.object({
  registerId: z.string().optional(),
  dayKeyFrom: DayKeySchema.optional(),
  dayKeyTo: DayKeySchema.optional(),
  status: CashDayCloseStatusSchema.optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().optional(),
});
export type ListCashDayClosesQuery = z.infer<typeof ListCashDayClosesQuerySchema>;

export const AttachBelegInputSchema = z
  .object({
    tenantId: z.string().optional(),
    workspaceId: z.string().optional(),
    entryId: z.string(),
    documentId: z.string().optional(),
    fileId: z.string().optional(),
    uploadToken: z.string().optional(),
    idempotencyKey: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    if (!value.documentId && !value.fileId && !value.uploadToken) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "documentId, fileId, or uploadToken is required",
        path: ["documentId"],
      });
    }
  });
export type AttachBelegInput = z.infer<typeof AttachBelegInputSchema>;

export const ExportCashBookFormatSchema = z.enum(["CSV", "PDF", "DATEV", "AUDIT_PACK"]);
export type ExportCashBookFormat = z.infer<typeof ExportCashBookFormatSchema>;

export const ExportCashBookInputSchema = z.object({
  tenantId: z.string().optional(),
  workspaceId: z.string().optional(),
  registerId: z.string(),
  month: MonthKeySchema,
  format: ExportCashBookFormatSchema,
  includeAttachmentFiles: z.boolean().optional().default(false),
  idempotencyKey: z.string().optional(),
});
export type ExportCashBookInput = z.infer<typeof ExportCashBookInputSchema>;

export const ExportCashBookOutputSchema = z.object({
  fileToken: z.string(),
  fileName: z.string(),
  contentType: z.string(),
  sizeBytes: z.number().int().nonnegative(),
  downloadUrl: z.string().optional(),
});
export type ExportCashBookOutput = z.infer<typeof ExportCashBookOutputSchema>;

// Legacy aliases.
export const CreateCashEntrySchema = CreateCashEntryInputSchema;
export type CreateCashEntry = CreateCashEntryInput;

export const ReverseCashEntrySchema = ReverseCashEntryInputSchema;
export type ReverseCashEntry = ReverseCashEntryInput;

export const SubmitDailyCloseSchema = SubmitCashDayCloseInputSchema;
export type SubmitDailyClose = SubmitCashDayCloseInput;

export const CashAssistantWorkspaceTypeSchema = z.enum([
  "DAILY_CASH_DAY",
  "MONTHLY_REVIEW",
  "GENERAL_HELP",
]);
export type CashAssistantWorkspaceType = z.infer<typeof CashAssistantWorkspaceTypeSchema>;

export const CashRegisterSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  location: z.string().nullable().optional(),
  currency: z.string().optional(),
});
export type CashRegisterSummary = z.infer<typeof CashRegisterSummarySchema>;

export const CashAssistantWorkspaceSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  workspaceId: z.string(),
  registerId: z.string().nullable().optional(),
  locationId: z.string().nullable().optional(),
  type: CashAssistantWorkspaceTypeSchema,
  businessDate: z.string().nullable().optional(),
  businessMonth: z.string().nullable().optional(),
  conversationId: z.string(),
  cashDayId: z.string().nullable().optional(),
  createdByUserId: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  register: CashRegisterSummarySchema.nullable().optional(),
});
export type CashAssistantWorkspace = z.infer<typeof CashAssistantWorkspaceSchema>;

export const ResolveCashAssistantWorkspaceInputSchema = z.object({
  type: CashAssistantWorkspaceTypeSchema,
  conversationId: z.string().optional(),
  registerId: z.string().optional(),
  businessDate: z.string().optional(),
  businessMonth: z.string().optional(),
  locationId: z.string().optional(),
});
export type ResolveCashAssistantWorkspaceInput = z.infer<
  typeof ResolveCashAssistantWorkspaceInputSchema
>;

export const ResolveCashAssistantWorkspaceOutputSchema = CashAssistantWorkspaceSchema;
export type ResolveCashAssistantWorkspaceOutput = z.infer<
  typeof ResolveCashAssistantWorkspaceOutputSchema
>;

export const OpenCashDayWorkspaceInputSchema = z.object({
  tenantId: z.string().optional(),
  workspaceId: z.string().optional(),
  registerId: z.string(),
  businessDate: DayKeySchema,
  movementType: z.string().min(1),
  amountCents: z.number().int(),
  description: z.string().min(1),
  evidenceRequirement: z.string().optional().nullable(),
});
export type OpenCashDayWorkspaceInput = z.infer<typeof OpenCashDayWorkspaceInputSchema>;

export const OpenCashDayWorkspaceOutputSchema = z.object({
  workspaceId: z.string(),
  conversationId: z.string(),
  handoffId: z.string(),
  confirmationId: z.string(),
});
export type OpenCashDayWorkspaceOutput = z.infer<typeof OpenCashDayWorkspaceOutputSchema>;

export { DayKeySchema, MonthKeySchema, DailyCloseStatus };
