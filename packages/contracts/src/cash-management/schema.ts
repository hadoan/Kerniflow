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
    /** A single end-of-day Z report; only one active report may exist per register/day. */
    dailyZReport: z.boolean().optional().default(false),
    /** Explicit acknowledgement after the API has identified a possible duplicate. */
    allowPossibleDuplicate: z.boolean().optional().default(false),
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

export const ClosedDayCorrectionTypeSchema = z.enum([
  "MISSING_ENTRY",
  "REVERSE_ENTRY",
  "REPLACE_ENTRY",
  "BALANCE_EXPLANATION",
]);
export type ClosedDayCorrectionType = z.infer<typeof ClosedDayCorrectionTypeSchema>;

export const CreateClosedDayCorrectionInputSchema = z
  .object({
    registerId: z.string(),
    dayKey: DayKeySchema,
    correctionType: ClosedDayCorrectionTypeSchema,
    occurredAt: z.string(),
    reason: z.string().min(3).max(1_000),
    originalEntryId: z.string().optional(),
    entry: z
      .object({
        type: CashEntryTypeSchema,
        description: z.string().min(1).max(1_000),
        grossAmountCents: z.number().int().positive(),
        tax: z
          .object({
            mode: CashEntryTaxModeSchema.optional(),
            taxCodeId: z.string().optional().nullable(),
          })
          .optional(),
      })
      .optional(),
    attachmentIds: z.array(z.string()).max(10).default([]),
    idempotencyKey: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    const needsOriginalEntry =
      value.correctionType === "REVERSE_ENTRY" || value.correctionType === "REPLACE_ENTRY";
    const needsNewEntry = value.correctionType !== "REVERSE_ENTRY";

    if (needsOriginalEntry && !value.originalEntryId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "originalEntryId is required for reversal or replacement",
        path: ["originalEntryId"],
      });
    }

    if (needsNewEntry && !value.entry) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "entry is required unless correctionType is REVERSE_ENTRY",
        path: ["entry"],
      });
    }

    if (
      value.entry?.tax?.mode &&
      value.entry.tax.mode !== CashEntryTaxMode.NONE &&
      !value.entry.tax.taxCodeId
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "entry.tax.taxCodeId is required when tax mode is taxable",
        path: ["entry", "tax", "taxCodeId"],
      });
    }
  });
export type CreateClosedDayCorrectionInput = z.infer<typeof CreateClosedDayCorrectionInputSchema>;

export const CashDayCloseRevisionSchema = z.object({
  id: z.string(),
  dayCloseId: z.string(),
  correctionEntryId: z.string(),
  revisionNo: z.number().int().positive(),
  correctionType: ClosedDayCorrectionTypeSchema,
  reason: z.string(),
  occurredAt: z.string(),
  recordedAt: z.string(),
  createdByUserId: z.string(),
  downstreamReviewRequired: z.boolean(),
});
export type CashDayCloseRevision = z.infer<typeof CashDayCloseRevisionSchema>;

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
    mode: z.enum(["COUNTED", "SKIPPED"]).optional().default("COUNTED"),
    countedClosingCashCents: z.number().int().optional(),
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

    if (value.mode === "COUNTED") {
      const hasCounted =
        value.countedClosingCashCents !== undefined ||
        value.countedBalance !== undefined ||
        value.countedBalanceCents !== undefined;
      if (!hasCounted && value.denominationCounts.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "counted balance or denominationCounts is required in COUNTED mode",
          path: ["countedClosingCashCents"],
        });
      }
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
