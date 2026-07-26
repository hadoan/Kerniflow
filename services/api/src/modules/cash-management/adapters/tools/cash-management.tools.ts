import { z } from "zod";
import {
  CashDayCloseStatus,
  CashEntryDirection,
  CashEntrySource,
  CashEntryType,
  type CashPaymentMethod,
  ExportCashBookFormatSchema,
  type CashDayClose,
  type CashEntry,
  localDateSchema,
  PrepareCashDayConfirmationInputSchema,
  ConfirmCashDayDraftInputSchema,
  GetMonthlyCashReportQuerySchema,
  RequestCashClarificationInputSchema,
  type CashRegister,
} from "@corely/contracts";
import { isErr, type Result, type UseCaseError } from "@corely/kernel";
import { type DomainToolPort } from "../../../ai-copilot/application/ports/domain-tool.port";
import { buildToolCtx, validationError } from "../../../ai-copilot/infrastructure/tools/tool-utils";
import { type DocumentsApplication } from "../../../documents/application/documents.application";
import type { CashAssistantWorkspaceType } from "../../domain/entities";
import { type CashWorkspaceRepoPort } from "../../application/ports/cash-management.ports";

import { type ListCashRegistersQueryUseCase } from "../../application/use-cases/list-cash-registers.query";
import { type GetCashRegisterQueryUseCase } from "../../application/use-cases/get-cash-register.query";
import { type ListCashEntriesQueryUseCase } from "../../application/use-cases/list-cash-entries.query";
import { type GetCashEntryQueryUseCase } from "../../application/use-cases/get-cash-entry.query";
import { type CreateCashEntryUseCase } from "../../application/use-cases/create-cash-entry.usecase";
import { type ReverseCashEntryUseCase } from "../../application/use-cases/reverse-cash-entry.usecase";
import { type GetCashDayCloseQueryUseCase } from "../../application/use-cases/get-cash-day-close.query";
import { type SaveCashDayCountUseCase } from "../../application/use-cases/save-cash-day-count.usecase";
import { type SubmitCashDayCloseUseCase } from "../../application/use-cases/submit-cash-day-close.usecase";
import { type ListCashDayClosesQueryUseCase } from "../../application/use-cases/list-cash-day-closes.query";
import { type AttachBelegToCashEntryUseCase } from "../../application/use-cases/attach-beleg-to-cash-entry.usecase";
import { type ListCashEntryAttachmentsQueryUseCase } from "../../application/use-cases/list-cash-entry-attachments.query";
import { type GetCashReportPreviewQueryUseCase } from "../../application/use-cases/get-cash-report-preview.query";
import { type PrepareCashDayConfirmationUseCase } from "../../application/use-cases/prepare-cash-day-confirmation.usecase";
import { type ConfirmCashDayDraftUseCase } from "../../application/use-cases/confirm-cash-day-draft.usecase";
import { type GetMonthlyCashReportQueryUseCase } from "../../application/use-cases/get-monthly-cash-report.query";
import { type ExportCashBookUseCase } from "../../application/use-cases/export-cash-book.usecase";
import {
  extractLatestUserAttachments,
  normalizeAttachment,
} from "../../../../shared/adapters/tools/file-parts";
import { mapToolResult } from "../../../../shared/adapters/tools/tool-mappers";
import { cashManagementToolDescriptions } from "./cash-management.tool-copy";
import {
  glossary,
  resolveGlossaryEntry,
  fuzzyResolveGlossaryEntry,
  type GlossaryLocalizedContent,
} from "./cash-management.glossary";

type ToolFailure = {
  ok: false;
  code: string;
  message: string;
  details?: unknown;
};

type ToolCtx = {
  tenantId: string;
  workspaceId?: string;
  userId: string;
  toolCallId?: string;
  runId?: string;
  workspaceCtx?: CashAssistantExecutionContext | null;
};

type CashStatusCode = "OPEN" | "NEEDS_REVIEW" | "READY_TO_CLOSE" | "CLOSED";

type CashToolDeps = {
  listRegisters: ListCashRegistersQueryUseCase;
  getRegister: GetCashRegisterQueryUseCase;
  listEntries: ListCashEntriesQueryUseCase;
  getEntry: GetCashEntryQueryUseCase;
  createEntry: CreateCashEntryUseCase;
  reverseEntry: ReverseCashEntryUseCase;
  getDayClose: GetCashDayCloseQueryUseCase;
  saveDayCount: SaveCashDayCountUseCase;
  submitDayClose: SubmitCashDayCloseUseCase;
  listDayCloses: ListCashDayClosesQueryUseCase;
  attachBeleg: AttachBelegToCashEntryUseCase;
  listAttachments: ListCashEntryAttachmentsQueryUseCase;
  exportCashBook: ExportCashBookUseCase;
  getReportPreview: GetCashReportPreviewQueryUseCase;
  prepareConfirmation: PrepareCashDayConfirmationUseCase;
  confirmDraft: ConfirmCashDayDraftUseCase;
  getMonthlyReport: GetMonthlyCashReportQueryUseCase;
  documentsApp: DocumentsApplication;
  workspaceRepo: CashWorkspaceRepoPort;
};

export type CashAssistantExecutionContext = {
  type: CashAssistantWorkspaceType;
  registerId: string | null;
  locationId: string | null;
  businessDate: Date | null;
  businessMonth: Date | null;
};

const MonthKeySchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Expected YYYY-MM");

const RegisterScopedSchema = z.object({
  registerId: z.string().min(1).optional(),
});

const CreateCashEntryToolInputSchema = RegisterScopedSchema.extend({
  description: z.string().min(1),
  amountCents: z.number().int().positive(),
  type: z.nativeEnum(CashEntryType).optional(),
  direction: z.nativeEnum(CashEntryDirection).optional(),
  source: z.string().min(1).optional(),
  paymentMethod: z.string().min(1).optional(),
  occurredAt: z.string().datetime().optional(),
  dayKey: localDateSchema.optional(),
  referenceId: z.string().optional().nullable(),
  documentId: z.string().min(1).optional(),
  documentIds: z.array(z.string().min(1)).optional(),
  idempotencyKey: z.string().min(1).optional(),
});

const UpdateCashEntryToolInputSchema = z
  .object({
    entryId: z.string().min(1),
    reason: z.string().min(1),
    description: z.string().min(1).optional(),
    amountCents: z.number().int().positive().optional(),
    type: z.nativeEnum(CashEntryType).optional(),
    direction: z.nativeEnum(CashEntryDirection).optional(),
    source: z.string().min(1).optional(),
    paymentMethod: z.string().min(1).optional(),
    occurredAt: z.string().datetime().optional(),
    dayKey: localDateSchema.optional(),
    referenceId: z.string().optional().nullable(),
  })
  .superRefine((value, ctx) => {
    const hasChanges =
      value.description !== undefined ||
      value.amountCents !== undefined ||
      value.type !== undefined ||
      value.direction !== undefined ||
      value.source !== undefined ||
      value.paymentMethod !== undefined ||
      value.occurredAt !== undefined ||
      value.dayKey !== undefined ||
      value.referenceId !== undefined;

    if (!hasChanges) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least one updated field is required",
        path: ["entryId"],
      });
    }
  });

const ListCashEntriesToolInputSchema = RegisterScopedSchema.extend({
  dayKeyFrom: localDateSchema.optional(),
  dayKeyTo: localDateSchema.optional(),
  type: z.nativeEnum(CashEntryType).optional(),
  source: z.string().min(1).optional(),
  paymentMethod: z.string().min(1).optional(),
  q: z.string().min(1).optional(),
});

const UploadReceiptToolInputSchema = z
  .object({
    filename: z.string().min(1).optional(),
    contentType: z.string().min(1).optional(),
    base64: z.string().min(1).optional(),
    isPublic: z.boolean().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.base64 && !value.contentType) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "contentType is required when base64 is provided",
        path: ["contentType"],
      });
    }
  });

const AttachReceiptToolInputSchema = z
  .object({
    entryId: z.string().min(1),
    documentId: z.string().min(1).optional(),
    documentIds: z.array(z.string().min(1)).optional(),
  })
  .superRefine((value, ctx) => {
    if (!value.documentId && !value.documentIds?.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "documentId or documentIds is required",
        path: ["documentId"],
      });
    }
  });

const CountedCashToolInputBaseSchema = RegisterScopedSchema.extend({
  dayKey: localDateSchema.optional(),
  countedBalanceCents: z.number().int().nonnegative().optional(),
  denominationCounts: z
    .array(
      z.object({
        denomination: z.number().int().nonnegative(),
        count: z.number().int().nonnegative(),
        subtotal: z.number().int().nonnegative(),
      })
    )
    .optional()
    .default([]),
  note: z.string().optional(),
  idempotencyKey: z.string().min(1).optional(),
});

const CountedCashToolInputSchema = CountedCashToolInputBaseSchema.superRefine((value, ctx) => {
  if (value.countedBalanceCents === undefined && value.denominationCounts.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "countedBalanceCents or denominationCounts is required",
      path: ["countedBalanceCents"],
    });
  }
});

const CloseCashDayToolInputSchema = CountedCashToolInputBaseSchema.partial({
  countedBalanceCents: true,
  denominationCounts: true,
}).extend({
  dayKey: localDateSchema.optional(),
  note: z.string().optional(),
  idempotencyKey: z.string().min(1).optional(),
});

const ListUnclosedDaysToolInputSchema = RegisterScopedSchema.extend({
  dayKeyFrom: localDateSchema.optional(),
  dayKeyTo: localDateSchema.optional(),
});

const FindMissingReceiptsToolInputSchema = RegisterScopedSchema.extend({
  dayKeyFrom: localDateSchema.optional(),
  dayKeyTo: localDateSchema.optional(),
});

const GenerateMonthlyExportToolInputSchema = RegisterScopedSchema.extend({
  month: MonthKeySchema.optional(),
  format: ExportCashBookFormatSchema.optional().default("DATEV"),
  includeAttachmentFiles: z.boolean().optional().default(false),
  idempotencyKey: z.string().min(1).optional(),
});

const DashboardSummaryToolInputSchema = RegisterScopedSchema.extend({
  dayKey: localDateSchema.optional(),
});

const ActionRequiredToolInputSchema = RegisterScopedSchema.extend({
  dayKey: localDateSchema.optional(),
});

const ExplainCashbookTermToolInputSchema = z.object({
  term: z.string().min(1),
  locale: z.enum(["en", "de", "vi"]).optional().default("en"),
});

const WorkflowHelpToolInputSchema = RegisterScopedSchema.extend({
  topic: z
    .enum(["close-day", "missing-receipts", "balance-difference", "monthly-export", "general"])
    .optional()
    .default("general"),
  dayKey: localDateSchema.optional(),
  locale: z.enum(["en", "de", "vi"]).optional().default("en"),
});

const GetCashReportPreviewToolInputSchema = RegisterScopedSchema.extend({
  businessDate: localDateSchema.optional(),
});

const receiptRequiredTypes = new Set<string>([
  CashEntryType.EXPENSE_CASH,
  CashEntryType.REFUND_CASH,
  CashEntryType.BANK_DEPOSIT,
  CashEntryType.BANK_WITHDRAWAL,
  CashEntryType.CORRECTION,
  CashEntryType.CLOSING_ADJUSTMENT,
  CashEntryType.OUT,
]);

const suspiciousEntryTypes = new Set<string>([
  CashEntryType.CORRECTION,
  CashEntryType.CLOSING_ADJUSTMENT,
  CashEntryType.IN,
  CashEntryType.OUT,
]);

const failure = (code: string, message: string, details?: unknown): ToolFailure => ({
  ok: false,
  code,
  message,
  details,
});

const toMonthKey = (dayKey: string): string => dayKey.slice(0, 7);

const toDayKey = (value?: string): string => {
  if (value) {
    return value.slice(0, 10);
  }
  return new Date().toISOString().slice(0, 10);
};

const monthRange = (monthKey: string) => {
  const [year, month] = monthKey.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return {
    dayKeyFrom: `${monthKey}-01`,
    dayKeyTo: `${monthKey}-${String(lastDay).padStart(2, "0")}`,
  };
};

const signedAmount = (entry: CashEntry): number =>
  entry.direction === CashEntryDirection.OUT ? -entry.amount : entry.amount;

const requiresReceipt = (entry: CashEntry): boolean => receiptRequiredTypes.has(entry.type);

const isSubmittedDayClose = (status: CashDayClose["status"] | "OPEN"): boolean =>
  status === CashDayCloseStatus.SUBMITTED;

const isToolFailure = (value: unknown): value is ToolFailure =>
  typeof value === "object" &&
  value !== null &&
  "ok" in value &&
  (value as { ok?: unknown }).ok === false &&
  "message" in value;

const unwrapResult = <T extends Record<string, unknown>>(
  result: Result<T, UseCaseError>
): T | ToolFailure => {
  if (isErr(result)) {
    return failure(
      result.error.code ?? "UNKNOWN_ERROR",
      result.error.message,
      result.error.details
    );
  }
  return result.value;
};

const getCtx = (params: ToolCtx) =>
  buildToolCtx({
    tenantId: params.tenantId,
    workspaceId: params.workspaceId,
    userId: params.userId,
    toolCallId: params.toolCallId,
    runId: params.runId,
  });

const withWorkspaceContext =
  (
    deps: CashToolDeps,
    allowedTypes: CashAssistantWorkspaceType[],
    handler: (
      params: Parameters<NonNullable<DomainToolPort["execute"]>>[0] & {
        workspaceCtx: CashAssistantExecutionContext | null;
      }
    ) => Promise<unknown>
  ): NonNullable<DomainToolPort["execute"]> =>
  async (params) => {
    let workspaceCtx: CashAssistantExecutionContext | null = null;

    if (params.tenantId && params.workspaceId && params.runId) {
      const ws = await deps.workspaceRepo.findWorkspaceByConversationId(
        params.tenantId,
        params.workspaceId,
        params.runId
      );
      if (ws) {
        workspaceCtx = {
          type: ws.type,
          registerId: ws.registerId,
          locationId: ws.locationId,
          businessDate: ws.businessDate,
          businessMonth: ws.businessMonth,
        };
      }
    }

    if (workspaceCtx && allowedTypes.length > 0 && !allowedTypes.includes(workspaceCtx.type)) {
      return failure(
        "UNAUTHORIZED_TOOL",
        `This tool is not allowed in ${workspaceCtx.type} workspaces.`
      );
    }

    return handler({ ...params, workspaceCtx });
  };

const resolveRegister = async (
  deps: CashToolDeps,
  params: ToolCtx,
  inputRegisterId?: string
): Promise<CashRegister | ToolFailure> => {
  const ctx = getCtx(params);

  const registerId = params.workspaceCtx?.registerId || inputRegisterId;

  if (registerId) {
    const result = unwrapResult(await deps.getRegister.execute({ registerId }, ctx));
    return isToolFailure(result) ? result : result.register;
  }

  const result = unwrapResult(await deps.listRegisters.execute({}, ctx));
  if (isToolFailure(result)) {
    return result;
  }

  if (result.registers.length === 0) {
    return failure("NOT_FOUND", "No cash registers found in the current workspace");
  }

  if (result.registers.length > 1) {
    return failure(
      "VALIDATION_ERROR",
      "registerId is required because multiple cash registers exist",
      {
        availableRegisters: result.registers.map((register) => ({
          id: register.id,
          name: register.name,
          location: register.location,
        })),
      }
    );
  }

  return result.registers[0];
};

const getDayCloseOrNull = async (
  deps: CashToolDeps,
  params: ToolCtx,
  registerId: string,
  dayKey: string
): Promise<CashDayClose | null | ToolFailure> => {
  const result = await deps.getDayClose.execute({ registerId, dayKey }, getCtx(params));
  if (isErr(result)) {
    if (
      result.error.code === "NOT_FOUND" ||
      result.error.code === "CashManagement:DayCloseNotFound"
    ) {
      return null;
    }
    return failure(
      result.error.code ?? "UNKNOWN_ERROR",
      result.error.message,
      result.error.details
    );
  }
  return result.value.dayClose;
};

const listEntriesForRange = async (
  deps: CashToolDeps,
  params: ToolCtx,
  registerId: string,
  input: {
    dayKeyFrom?: string;
    dayKeyTo?: string;
    type?: CashEntry["type"];
    source?: CashEntry["source"];
    paymentMethod?: CashEntry["paymentMethod"];
    q?: string;
  }
): Promise<CashEntry[] | ToolFailure> => {
  const result = unwrapResult(
    await deps.listEntries.execute(
      {
        registerId,
        dayKeyFrom: input.dayKeyFrom,
        dayKeyTo: input.dayKeyTo,
        type: input.type,
        source: input.source,
        paymentMethod: input.paymentMethod,
        q: input.q,
      },
      getCtx(params)
    )
  );
  return isToolFailure(result) ? result : result.entries;
};

const listAttachmentsByEntry = async (
  deps: CashToolDeps,
  params: ToolCtx,
  entries: CashEntry[]
): Promise<Map<string, number> | ToolFailure> => {
  const attachmentResults = await Promise.all(
    entries.map(async (entry) => {
      const result = unwrapResult(
        await deps.listAttachments.execute({ entryId: entry.id }, getCtx(params))
      );
      return { entryId: entry.id, result };
    })
  );

  const counts = new Map<string, number>();
  for (const item of attachmentResults) {
    if (isToolFailure(item.result)) {
      return item.result;
    }
    counts.set(item.entryId, item.result.attachments.length);
  }
  return counts;
};

const buildTodayStatus = async (
  deps: CashToolDeps,
  params: ToolCtx,
  register: CashRegister,
  dayKey: string
): Promise<
  | {
      register: CashRegister;
      dayKey: string;
      monthKey: string;
      entries: CashEntry[];
      dayClose: CashDayClose | null;
      openingBalanceCents: number;
      cashInTodayCents: number;
      cashOutTodayCents: number;
      expectedClosingCents: number;
      countedCashCents: number | null;
      differenceCents: number | null;
      missingReceipts: CashEntry[];
      suspiciousEntries: CashEntry[];
      status: CashStatusCode;
      blockers: string[];
      readyToClose: boolean;
    }
  | ToolFailure
> => {
  const entries = await listEntriesForRange(deps, params, register.id, {
    dayKeyFrom: dayKey,
    dayKeyTo: dayKey,
  });
  if (isToolFailure(entries)) {
    return entries;
  }

  const sortedAsc = [...entries].sort((a, b) => {
    const byTime = new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime();
    if (byTime !== 0) {
      return byTime;
    }
    return a.entryNo - b.entryNo;
  });

  const openingBalanceCents =
    sortedAsc.length > 0
      ? sortedAsc[0].balanceAfterCents - signedAmount(sortedAsc[0])
      : register.currentBalanceCents;

  const cashInTodayCents = entries
    .filter((entry) => entry.direction === CashEntryDirection.IN)
    .reduce((total, entry) => total + entry.amount, 0);

  const cashOutTodayCents = entries
    .filter((entry) => entry.direction === CashEntryDirection.OUT)
    .reduce((total, entry) => total + entry.amount, 0);

  const expectedClosingCents = openingBalanceCents + cashInTodayCents - cashOutTodayCents;
  const dayClose = await getDayCloseOrNull(deps, params, register.id, dayKey);
  if (isToolFailure(dayClose)) {
    return dayClose;
  }

  const receiptCandidates = entries.filter(requiresReceipt);
  const attachmentCounts = await listAttachmentsByEntry(deps, params, receiptCandidates);
  if (isToolFailure(attachmentCounts)) {
    return attachmentCounts;
  }

  const missingReceipts = receiptCandidates.filter(
    (entry) => (attachmentCounts?.get(entry.id) ?? 0) === 0
  );
  const suspiciousEntries = entries.filter(
    (entry) => suspiciousEntryTypes.has(entry.type) || entry.source === CashEntrySource.DIFFERENCE
  );

  const countedCashCents = dayClose ? dayClose.countedBalance : null;
  const differenceCents = dayClose ? dayClose.difference : null;
  const blockers: string[] = [];

  if (missingReceipts.length > 0) {
    blockers.push(`${missingReceipts.length} entries are missing receipts`);
  }
  if (countedCashCents === null) {
    blockers.push("Counted cash has not been entered yet");
  }
  if (differenceCents !== null && differenceCents !== 0 && !dayClose?.note) {
    blockers.push("Counted cash differs from expected balance and needs a note");
  }
  if (suspiciousEntries.length > 0) {
    blockers.push(`${suspiciousEntries.length} entries should be reviewed`);
  }

  let status: CashStatusCode = "OPEN";
  if (dayClose && isSubmittedDayClose(dayClose.status)) {
    status = "CLOSED";
  } else if (blockers.length > 0) {
    status = "NEEDS_REVIEW";
  } else if (countedCashCents !== null) {
    status = "READY_TO_CLOSE";
  }

  return {
    register,
    dayKey,
    monthKey: toMonthKey(dayKey),
    entries,
    dayClose,
    openingBalanceCents,
    cashInTodayCents,
    cashOutTodayCents,
    expectedClosingCents,
    countedCashCents,
    differenceCents,
    missingReceipts,
    suspiciousEntries,
    status,
    blockers,
    readyToClose: status === "READY_TO_CLOSE",
  };
};

const buildMonthExportStatus = async (
  deps: CashToolDeps,
  params: ToolCtx,
  registerId: string,
  monthKey: string
): Promise<
  | {
      monthKey: string;
      daysWithEntries: string[];
      openDays: string[];
      missingReceiptEntries: CashEntry[];
      reviewEntries: CashEntry[];
      ready: boolean;
      blockingReason: string | null;
    }
  | ToolFailure
> => {
  const range = monthRange(monthKey);
  const entries = await listEntriesForRange(deps, params, registerId, range);
  if (isToolFailure(entries)) {
    return entries;
  }

  const closesResult = unwrapResult(
    await deps.listDayCloses.execute({ registerId, ...range }, getCtx(params))
  );
  if (isToolFailure(closesResult)) {
    return closesResult;
  }

  const receiptCandidates = entries.filter(requiresReceipt);
  const attachmentCounts = await listAttachmentsByEntry(deps, params, receiptCandidates);
  if (isToolFailure(attachmentCounts)) {
    return attachmentCounts;
  }

  const missingReceiptEntries = receiptCandidates.filter(
    (entry) => (attachmentCounts?.get(entry.id) ?? 0) === 0
  );
  const reviewEntries = entries.filter(
    (entry) => suspiciousEntryTypes.has(entry.type) || entry.source === CashEntrySource.DIFFERENCE
  );

  const daysWithEntries: string[] = Array.from(
    new Set(
      entries
        .map((entry) => entry.dayKey)
        .filter((dayKey): dayKey is string => typeof dayKey === "string" && dayKey.length > 0)
    )
  ).sort();
  const submittedDays = new Set(
    closesResult.closes
      .filter((close) => isSubmittedDayClose(close.status))
      .map((close) => close.dayKey)
  );
  const openDays: string[] = daysWithEntries.filter((day) => !submittedDays.has(day));

  let blockingReason: string | null = null;
  if (openDays.length > 0) {
    blockingReason = `${openDays.length} day(s) still need closing`;
  } else if (missingReceiptEntries.length > 0) {
    blockingReason = `${missingReceiptEntries.length} entry/entries are missing receipts`;
  } else if (reviewEntries.length > 0) {
    blockingReason = `${reviewEntries.length} entry/entries still need review`;
  }

  return {
    monthKey,
    daysWithEntries,
    openDays,
    missingReceiptEntries,
    reviewEntries,
    ready: blockingReason === null,
    blockingReason,
  };
};

export const buildCashManagementTools = (deps: CashToolDeps): DomainToolPort[] => [
  {
    name: "prepare_cash_day_confirmation",
    description:
      "Generate a pending confirmation for closing the day with proposed cash entries and actual counted balance.",
    descriptions: cashManagementToolDescriptions.prepare_cash_day_confirmation,
    kind: "server",
    inputSchema: PrepareCashDayConfirmationInputSchema.omit({
      tenantId: true,
      workspaceId: true,
    }).extend({
      registerId: z.string().optional(),
    }),
    execute: withWorkspaceContext(
      deps,
      ["DAILY_CASH_DAY"],
      async ({ tenantId, workspaceId, userId, input, toolCallId, runId, workspaceCtx }) => {
        const parsed = PrepareCashDayConfirmationInputSchema.omit({
          tenantId: true,
          workspaceId: true,
        })
          .extend({ registerId: z.string().optional() })
          .safeParse(input);
        if (!parsed.success) {
          return validationError(parsed.error.flatten());
        }

        const register = await resolveRegister(
          deps,
          { tenantId, workspaceId, userId, toolCallId, runId },
          parsed.data.registerId
        );
        if (isToolFailure(register)) {
          return register;
        }

        return mapToolResult(
          await deps.prepareConfirmation.execute(
            { ...parsed.data, registerId: register.id },
            getCtx({ tenantId, workspaceId, userId, toolCallId, runId })
          )
        );
      }
    ),
  },
  {
    name: "update_cash_entry",
    description:
      "Update an open cash entry by reversing the old entry and creating a corrected replacement entry.",
    descriptions: cashManagementToolDescriptions.update_cash_entry,
    kind: "server",
    inputSchema: UpdateCashEntryToolInputSchema,
    execute: withWorkspaceContext(
      deps,
      ["DAILY_CASH_DAY", "MONTHLY_REVIEW"],
      async ({ tenantId, workspaceId, userId, input, toolCallId, runId, workspaceCtx }) => {
        const parsed = UpdateCashEntryToolInputSchema.safeParse(input);
        if (!parsed.success) {
          return validationError(parsed.error.flatten());
        }

        const originalResult = unwrapResult(
          await deps.getEntry.execute(
            { entryId: parsed.data.entryId },
            getCtx({ tenantId, workspaceId, userId, toolCallId, runId })
          )
        );
        if (isToolFailure(originalResult)) {
          return originalResult;
        }

        const original = originalResult.entry;
        if (original.lockedByDayCloseId) {
          return failure(
            "CONFLICT",
            "Closed entries cannot be updated automatically. Reverse them manually or post a correction."
          );
        }

        const reversed = mapToolResult(
          await deps.reverseEntry.execute(
            {
              entryId: original.id,
              reason: parsed.data.reason,
              dayKey: parsed.data.dayKey ?? original.dayKey,
            },
            getCtx({ tenantId, workspaceId, userId, toolCallId, runId })
          )
        );
        if (!reversed.ok) {
          return reversed;
        }

        const replacement = mapToolResult(
          await deps.createEntry.execute(
            {
              registerId: original.registerId,
              description: parsed.data.description ?? original.description,
              amount: parsed.data.amountCents ?? original.amount,
              type: parsed.data.type ?? original.type,
              direction: parsed.data.direction ?? original.direction,
              source:
                (parsed.data.source as (typeof CashEntrySource)[keyof typeof CashEntrySource]) ??
                original.source,
              paymentMethod:
                (parsed.data
                  .paymentMethod as (typeof CashPaymentMethod)[keyof typeof CashPaymentMethod]) ??
                original.paymentMethod,
              occurredAt: parsed.data.occurredAt ?? original.occurredAt,
              dayKey: parsed.data.dayKey ?? original.dayKey,
              referenceId:
                parsed.data.referenceId === undefined
                  ? original.referenceId
                  : parsed.data.referenceId,
            },
            getCtx({ tenantId, workspaceId, userId, toolCallId, runId })
          )
        );
        if (!replacement.ok) {
          return replacement;
        }

        return {
          ok: true,
          originalEntry: original,
          reversalEntry: reversed.entry,
          replacementEntry: replacement.entry,
        };
      }
    ),
  },
  {
    name: "list_cash_entries",
    description: "List cash entries for a register with optional date and search filters.",
    descriptions: cashManagementToolDescriptions.list_cash_entries,
    kind: "server",
    inputSchema: ListCashEntriesToolInputSchema,
    execute: withWorkspaceContext(
      deps,
      ["DAILY_CASH_DAY", "MONTHLY_REVIEW"],
      async ({ tenantId, workspaceId, userId, input, toolCallId, runId, workspaceCtx }) => {
        const parsed = ListCashEntriesToolInputSchema.safeParse(input);
        if (!parsed.success) {
          return validationError(parsed.error.flatten());
        }

        const register = await resolveRegister(
          deps,
          { tenantId, workspaceId, userId, toolCallId, runId },
          parsed.data.registerId
        );
        if (isToolFailure(register)) {
          return register;
        }

        const result = unwrapResult(
          await deps.listEntries.execute(
            { registerId: register.id, ...parsed.data },
            getCtx({ tenantId, workspaceId, userId, toolCallId, runId })
          )
        );

        return isToolFailure(result)
          ? result
          : {
              ok: true,
              register,
              entries: result.entries,
              total: result.entries.length,
            };
      }
    ),
  },
  {
    name: "upload_receipt",
    description:
      "Upload one or more receipt files from the latest user attachment or explicit base64 input.",
    descriptions: cashManagementToolDescriptions.upload_receipt,
    kind: "server",
    inputSchema: UploadReceiptToolInputSchema,
    execute: withWorkspaceContext(
      deps,
      ["DAILY_CASH_DAY", "MONTHLY_REVIEW"],
      async ({
        tenantId,
        workspaceId,
        userId,
        input,
        toolCallId,
        runId,
        messages,
        workspaceCtx,
      }) => {
        const parsed = UploadReceiptToolInputSchema.safeParse(input);
        if (!parsed.success) {
          return validationError(parsed.error.flatten());
        }

        const uploads = [];
        const latestAttachments = extractLatestUserAttachments(messages);
        if (latestAttachments.length > 0) {
          for (const [index, attachment] of latestAttachments.entries()) {
            const normalized = normalizeAttachment(attachment, index);
            if (!normalized) {
              continue;
            }
            const uploaded = unwrapResult(
              await deps.documentsApp.uploadFile.execute(
                {
                  filename: normalized.filename,
                  contentType: normalized.contentType,
                  base64: normalized.base64,
                  isPublic: false,
                  category: "cash-receipt",
                  purpose: "copilot.cash.receipt",
                },
                getCtx({ tenantId, workspaceId, userId, toolCallId, runId })
              )
            );
            if (isToolFailure(uploaded)) {
              return uploaded;
            }
            uploads.push(uploaded.document);
          }
        } else if (parsed.data.base64 && parsed.data.contentType) {
          const uploaded = unwrapResult(
            await deps.documentsApp.uploadFile.execute(
              {
                filename: parsed.data.filename ?? "receipt-upload",
                contentType: parsed.data.contentType,
                base64: parsed.data.base64,
                isPublic: parsed.data.isPublic ?? false,
                category: "cash-receipt",
                purpose: "copilot.cash.receipt",
              },
              getCtx({ tenantId, workspaceId, userId, toolCallId, runId })
            )
          );
          if (isToolFailure(uploaded)) {
            return uploaded;
          }
          uploads.push(uploaded.document);
        } else {
          return failure(
            "VALIDATION_ERROR",
            "Attach a file in chat or provide filename/contentType/base64 input"
          );
        }

        return {
          ok: true,
          documents: uploads,
          total: uploads.length,
        };
      }
    ),
  },
  {
    name: "attach_receipt_to_entry",
    description: "Attach one or more uploaded receipt documents to a cash entry.",
    descriptions: cashManagementToolDescriptions.attach_receipt_to_entry,
    kind: "server",
    inputSchema: AttachReceiptToolInputSchema,
    execute: withWorkspaceContext(
      deps,
      ["DAILY_CASH_DAY", "MONTHLY_REVIEW"],
      async ({ tenantId, workspaceId, userId, input, toolCallId, runId, workspaceCtx }) => {
        const parsed = AttachReceiptToolInputSchema.safeParse(input);
        if (!parsed.success) {
          return validationError(parsed.error.flatten());
        }

        const documentIds = new Set<string>();
        if (parsed.data.documentId) {
          documentIds.add(parsed.data.documentId);
        }
        for (const documentId of parsed.data.documentIds ?? []) {
          documentIds.add(documentId);
        }

        const attachments = [];
        for (const documentId of documentIds) {
          const attached = mapToolResult(
            await deps.attachBeleg.execute(
              { entryId: parsed.data.entryId, documentId },
              getCtx({ tenantId, workspaceId, userId, toolCallId, runId })
            )
          );
          if (!attached.ok) {
            return attached;
          }
          attachments.push(attached.attachment);
        }

        return {
          ok: true,
          entryId: parsed.data.entryId,
          attachments,
        };
      }
    ),
  },
  {
    name: "get_today_cash_status",
    description: "Get today's operational cash status for the current register.",
    descriptions: cashManagementToolDescriptions.get_today_cash_status,
    kind: "server",
    inputSchema: DashboardSummaryToolInputSchema,
    execute: withWorkspaceContext(
      deps,
      ["DAILY_CASH_DAY"],
      async ({ tenantId, workspaceId, userId, input, toolCallId, runId, workspaceCtx }) => {
        const parsed = DashboardSummaryToolInputSchema.safeParse(input);
        if (!parsed.success) {
          return validationError(parsed.error.flatten());
        }

        const register = await resolveRegister(
          deps,
          { tenantId, workspaceId, userId, toolCallId, runId },
          parsed.data.registerId
        );
        if (isToolFailure(register)) {
          return register;
        }

        const status = await buildTodayStatus(
          deps,
          { tenantId, workspaceId, userId, toolCallId, runId },
          register,
          toDayKey(parsed.data.dayKey)
        );
        if (isToolFailure(status)) {
          return status;
        }

        return {
          ok: true,
          register: {
            id: status.register.id,
            name: status.register.name,
            location: status.register.location,
            currency: status.register.currency,
          },
          dayKey: status.dayKey,
          openingBalanceCents: status.openingBalanceCents,
          cashInTodayCents: status.cashInTodayCents,
          cashOutTodayCents: status.cashOutTodayCents,
          expectedClosingCents: status.expectedClosingCents,
          countedCashCents: status.countedCashCents,
          differenceCents: status.differenceCents,
          status: status.status,
          readyToClose: status.readyToClose,
          missingReceiptsCount: status.missingReceipts.length,
          reviewEntriesCount: status.suspiciousEntries.length,
          blockers: status.blockers,
        };
      }
    ),
  },
  {
    name: "confirm_cash_day_draft",
    description:
      "Confirm a previously prepared cash day draft by atomically saving the proposed movements and submitting the counted cash.",
    descriptions: cashManagementToolDescriptions.confirm_cash_day_draft,
    kind: "server",
    inputSchema: ConfirmCashDayDraftInputSchema.omit({ tenantId: true, workspaceId: true }).extend({
      registerId: z.string().optional(),
    }),
    execute: withWorkspaceContext(
      deps,
      ["DAILY_CASH_DAY"],
      async ({ tenantId, workspaceId, userId, input, toolCallId, runId, workspaceCtx }) => {
        const parsed = ConfirmCashDayDraftInputSchema.omit({ tenantId: true, workspaceId: true })
          .extend({ registerId: z.string().optional() })
          .safeParse(input);
        if (!parsed.success) {
          return validationError(parsed.error.flatten());
        }

        const register = await resolveRegister(
          deps,
          { tenantId, workspaceId, userId, toolCallId, runId },
          parsed.data.registerId
        );
        if (isToolFailure(register)) {
          return register;
        }

        return mapToolResult(
          await deps.confirmDraft.execute(
            { ...parsed.data, registerId: register.id },
            getCtx({ tenantId, workspaceId, userId, toolCallId, runId })
          )
        );
      }
    ),
  },
  {
    name: "close_cash_day",
    description: "Finalize and close the current cash day once counted cash is ready.",
    descriptions: cashManagementToolDescriptions.close_cash_day,
    kind: "server",
    inputSchema: CloseCashDayToolInputSchema,
    execute: withWorkspaceContext(
      deps,
      ["DAILY_CASH_DAY"],
      async ({ tenantId, workspaceId, userId, input, toolCallId, runId, workspaceCtx }) => {
        const parsed = CloseCashDayToolInputSchema.safeParse(input);
        if (!parsed.success) {
          return validationError(parsed.error.flatten());
        }

        const register = await resolveRegister(
          deps,
          { tenantId, workspaceId, userId, toolCallId, runId },
          parsed.data.registerId
        );
        if (isToolFailure(register)) {
          return register;
        }

        const dayKey = toDayKey(parsed.data.dayKey);
        const existingDayClose = await getDayCloseOrNull(
          deps,
          { tenantId, workspaceId, userId, toolCallId, runId },
          register.id,
          dayKey
        );
        if (isToolFailure(existingDayClose)) {
          return existingDayClose;
        }

        if (existingDayClose && isSubmittedDayClose(existingDayClose.status)) {
          return {
            ok: true,
            register,
            alreadyClosed: true,
            dayClose: existingDayClose,
          };
        }

        const submitInput =
          parsed.data.countedBalanceCents !== undefined ||
          (parsed.data.denominationCounts?.length ?? 0) > 0
            ? {
                registerId: register.id,
                dayKey,
                countedBalanceCents: parsed.data.countedBalanceCents,
                denominationCounts: parsed.data.denominationCounts ?? [],
                note: parsed.data.note ?? existingDayClose?.note ?? undefined,
                idempotencyKey: parsed.data.idempotencyKey,
              }
            : existingDayClose
              ? {
                  registerId: register.id,
                  dayKey,
                  countedBalanceCents: existingDayClose.countedBalance,
                  denominationCounts: existingDayClose.denominationCounts ?? [],
                  note: parsed.data.note ?? existingDayClose.note ?? undefined,
                  idempotencyKey: parsed.data.idempotencyKey,
                }
              : null;

        if (!submitInput) {
          return failure(
            "VALIDATION_ERROR",
            "Counted cash is missing. Submit counted cash first or pass countedBalanceCents."
          );
        }

        const result = mapToolResult(
          await deps.submitDayClose.execute(
            submitInput,
            getCtx({ tenantId, workspaceId, userId, toolCallId, runId })
          )
        );
        if (!result.ok) {
          return result;
        }

        return {
          ok: true,
          register,
          dayClose: result.dayClose,
          closed: true,
        };
      }
    ),
  },
  {
    name: "list_unclosed_days",
    description: "List days with entries that are still open or only saved as drafts.",
    descriptions: cashManagementToolDescriptions.list_unclosed_days,
    kind: "server",
    inputSchema: ListUnclosedDaysToolInputSchema,
    execute: withWorkspaceContext(
      deps,
      ["MONTHLY_REVIEW"],
      async ({ tenantId, workspaceId, userId, input, toolCallId, runId, workspaceCtx }) => {
        const parsed = ListUnclosedDaysToolInputSchema.safeParse(input);
        if (!parsed.success) {
          return validationError(parsed.error.flatten());
        }

        const register = await resolveRegister(
          deps,
          { tenantId, workspaceId, userId, toolCallId, runId },
          parsed.data.registerId
        );
        if (isToolFailure(register)) {
          return register;
        }

        const dayKeyTo = parsed.data.dayKeyTo ?? toDayKey();
        const dayKeyFrom = parsed.data.dayKeyFrom ?? `${dayKeyTo.slice(0, 7)}-01`;
        const entries = await listEntriesForRange(
          deps,
          { tenantId, workspaceId, userId, toolCallId, runId },
          register.id,
          { dayKeyFrom, dayKeyTo }
        );
        if (isToolFailure(entries)) {
          return entries;
        }

        const closesResult = unwrapResult(
          await deps.listDayCloses.execute(
            { registerId: register.id, dayKeyFrom, dayKeyTo },
            getCtx({ tenantId, workspaceId, userId, toolCallId, runId })
          )
        );
        if (isToolFailure(closesResult)) {
          return closesResult;
        }

        const byDay = new Map<string, CashEntry[]>();
        for (const entry of entries) {
          const items = byDay.get(entry.dayKey) ?? [];
          items.push(entry);
          byDay.set(entry.dayKey, items);
        }

        const closeByDay = new Map(closesResult.closes.map((close) => [close.dayKey, close]));
        const openDays = Array.from(byDay.entries())
          .map(([dayKey, dayEntries]) => {
            const close = closeByDay.get(dayKey) ?? null;
            return {
              dayKey,
              entriesCount: dayEntries.length,
              status: (close?.status ?? "OPEN") as CashDayClose["status"] | "OPEN",
              countedCashCents: close?.countedBalance ?? null,
              differenceCents: close?.difference ?? null,
            };
          })
          .filter((item) => !isSubmittedDayClose(item.status))
          .sort((a, b) => a.dayKey.localeCompare(b.dayKey));

        return {
          ok: true,
          register,
          dayKeyFrom,
          dayKeyTo,
          openDays,
          total: openDays.length,
        };
      }
    ),
  },
  {
    name: "find_missing_receipts",
    description: "Find receipt-required cash entries that still do not have an attachment.",
    descriptions: cashManagementToolDescriptions.find_missing_receipts,
    kind: "server",
    inputSchema: FindMissingReceiptsToolInputSchema,
    execute: withWorkspaceContext(
      deps,
      ["MONTHLY_REVIEW", "DAILY_CASH_DAY"],
      async ({ tenantId, workspaceId, userId, input, toolCallId, runId, workspaceCtx }) => {
        const parsed = FindMissingReceiptsToolInputSchema.safeParse(input);
        if (!parsed.success) {
          return validationError(parsed.error.flatten());
        }

        const register = await resolveRegister(
          deps,
          { tenantId, workspaceId, userId, toolCallId, runId },
          parsed.data.registerId
        );
        if (isToolFailure(register)) {
          return register;
        }

        const dayKeyTo = parsed.data.dayKeyTo ?? toDayKey();
        const dayKeyFrom = parsed.data.dayKeyFrom ?? `${dayKeyTo.slice(0, 7)}-01`;
        const entries = await listEntriesForRange(
          deps,
          { tenantId, workspaceId, userId, toolCallId, runId },
          register.id,
          { dayKeyFrom, dayKeyTo }
        );
        if (isToolFailure(entries)) {
          return entries;
        }

        const candidates = entries.filter(requiresReceipt);
        const attachmentCounts = await listAttachmentsByEntry(
          deps,
          { tenantId, workspaceId, userId, toolCallId, runId },
          candidates
        );
        if (isToolFailure(attachmentCounts)) {
          return attachmentCounts;
        }

        const missingEntries = candidates
          .filter((entry) => (attachmentCounts?.get(entry.id) ?? 0) === 0)
          .map((entry) => ({
            id: entry.id,
            dayKey: entry.dayKey,
            occurredAt: entry.occurredAt,
            description: entry.description,
            amountCents: entry.amount,
            type: entry.type,
          }));

        return {
          ok: true,
          register,
          dayKeyFrom,
          dayKeyTo,
          missingEntries,
          total: missingEntries.length,
        };
      }
    ),
  },
  {
    name: "generate_monthly_export",
    description: "Generate the monthly cash export package for the tax advisor.",
    descriptions: cashManagementToolDescriptions.generate_monthly_export,
    kind: "server",
    inputSchema: GenerateMonthlyExportToolInputSchema,
    execute: withWorkspaceContext(
      deps,
      ["MONTHLY_REVIEW"],
      async ({ tenantId, workspaceId, userId, input, toolCallId, runId, workspaceCtx }) => {
        const parsed = GenerateMonthlyExportToolInputSchema.safeParse(input);
        if (!parsed.success) {
          return validationError(parsed.error.flatten());
        }

        const register = await resolveRegister(
          deps,
          { tenantId, workspaceId, userId, toolCallId, runId },
          parsed.data.registerId
        );
        if (isToolFailure(register)) {
          return register;
        }

        const monthKey = parsed.data.month ?? toMonthKey(toDayKey());
        const exportStatus = await buildMonthExportStatus(
          deps,
          { tenantId, workspaceId, userId, toolCallId, runId },
          register.id,
          monthKey
        );
        if (isToolFailure(exportStatus)) {
          return exportStatus;
        }
        if (!exportStatus.ready) {
          return failure("CONFLICT", "Monthly export is blocked", {
            blockingReason: exportStatus.blockingReason,
            openDays: exportStatus.openDays,
            missingReceiptEntryIds: exportStatus.missingReceiptEntries.map((entry) => entry.id),
          });
        }

        const result = mapToolResult(
          await deps.exportCashBook.execute(
            {
              registerId: register.id,
              month: monthKey,
              format: parsed.data.format,
              includeAttachmentFiles: parsed.data.includeAttachmentFiles,
              idempotencyKey: parsed.data.idempotencyKey,
            },
            getCtx({ tenantId, workspaceId, userId, toolCallId, runId })
          )
        );

        return result.ok
          ? {
              ok: true,
              register,
              month: monthKey,
              export: result.export,
            }
          : result;
      }
    ),
  },
  {
    name: "get_dashboard_summary",
    description:
      "Return the operational dashboard summary for cash, receipts, close status, and export readiness.",
    descriptions: cashManagementToolDescriptions.get_dashboard_summary,
    kind: "server",
    inputSchema: DashboardSummaryToolInputSchema,
    execute: withWorkspaceContext(
      deps,
      ["MONTHLY_REVIEW", "DAILY_CASH_DAY"],
      async ({ tenantId, workspaceId, userId, input, toolCallId, runId, workspaceCtx }) => {
        const parsed = DashboardSummaryToolInputSchema.safeParse(input);
        if (!parsed.success) {
          return validationError(parsed.error.flatten());
        }

        const register = await resolveRegister(
          deps,
          { tenantId, workspaceId, userId, toolCallId, runId },
          parsed.data.registerId
        );
        if (isToolFailure(register)) {
          return register;
        }

        const status = await buildTodayStatus(
          deps,
          { tenantId, workspaceId, userId, toolCallId, runId },
          register,
          toDayKey(parsed.data.dayKey)
        );
        if (isToolFailure(status)) {
          return status;
        }

        const exportStatus = await buildMonthExportStatus(
          deps,
          { tenantId, workspaceId, userId, toolCallId, runId },
          register.id,
          status.monthKey
        );
        if (isToolFailure(exportStatus)) {
          return exportStatus;
        }

        return {
          ok: true,
          register: {
            id: register.id,
            name: register.name,
            location: register.location,
            currency: register.currency,
          },
          today: {
            dayKey: status.dayKey,
            openingBalanceCents: status.openingBalanceCents,
            cashInTodayCents: status.cashInTodayCents,
            cashOutTodayCents: status.cashOutTodayCents,
            expectedClosingCents: status.expectedClosingCents,
            countedCashCents: status.countedCashCents,
            differenceCents: status.differenceCents,
            closingStatus: status.status,
            missingReceiptsCount: status.missingReceipts.length,
            reviewEntriesCount: status.suspiciousEntries.length,
          },
          month: {
            monthKey: status.monthKey,
            openDaysCount: exportStatus.openDays.length,
            missingReceiptsCount: exportStatus.missingReceiptEntries.length,
            reviewEntriesCount: exportStatus.reviewEntries.length,
            exportReady: exportStatus.ready,
            blockingReason: exportStatus.blockingReason,
          },
        };
      }
    ),
  },
  {
    name: "get_action_required",
    description: "Return the next operational actions the owner should take.",
    descriptions: cashManagementToolDescriptions.get_action_required,
    kind: "server",
    inputSchema: ActionRequiredToolInputSchema,
    execute: withWorkspaceContext(
      deps,
      ["MONTHLY_REVIEW", "DAILY_CASH_DAY"],
      async ({ tenantId, workspaceId, userId, input, toolCallId, runId, workspaceCtx }) => {
        const parsed = ActionRequiredToolInputSchema.safeParse(input);
        if (!parsed.success) {
          return validationError(parsed.error.flatten());
        }

        const register = await resolveRegister(
          deps,
          { tenantId, workspaceId, userId, toolCallId, runId },
          parsed.data.registerId
        );
        if (isToolFailure(register)) {
          return register;
        }

        const status = await buildTodayStatus(
          deps,
          { tenantId, workspaceId, userId, toolCallId, runId },
          register,
          toDayKey(parsed.data.dayKey)
        );
        if (isToolFailure(status)) {
          return status;
        }

        const exportStatus = await buildMonthExportStatus(
          deps,
          { tenantId, workspaceId, userId, toolCallId, runId },
          register.id,
          status.monthKey
        );
        if (isToolFailure(exportStatus)) {
          return exportStatus;
        }

        const items = [];
        if (status.missingReceipts.length > 0) {
          items.push({
            priority: "high",
            title: `${status.missingReceipts.length} entries are missing receipts`,
            suggestedTool: "find_missing_receipts",
          });
        }
        if (status.status !== "CLOSED") {
          items.push({
            priority: status.readyToClose ? "medium" : "high",
            title: status.readyToClose
              ? "Today's cash book can be closed now"
              : "Today's cash book is not ready to close yet",
            suggestedTool: status.readyToClose ? "close_cash_day" : "submit_counted_cash",
          });
        }
        if (status.suspiciousEntries.length > 0) {
          items.push({
            priority: "medium",
            title: `${status.suspiciousEntries.length} entries should be reviewed`,
            suggestedTool: "list_cash_entries",
          });
        }
        if (exportStatus.openDays.length > 0) {
          items.push({
            priority: "medium",
            title: `${exportStatus.openDays.length} day(s) still need closing this month`,
            suggestedTool: "list_unclosed_days",
          });
        }
        if (exportStatus.ready) {
          items.push({
            priority: "low",
            title: "Monthly export is ready",
            suggestedTool: "generate_monthly_export",
          });
        } else if (exportStatus.blockingReason) {
          items.push({
            priority: "medium",
            title: "Monthly export is blocked",
            reason: exportStatus.blockingReason,
            suggestedTool: "get_dashboard_summary",
          });
        }

        return {
          ok: true,
          register,
          dayKey: status.dayKey,
          items,
        };
      }
    ),
  },
  {
    name: "explain_cashbook_term",
    description: "Explain common cash-book terms in plain language for salon owners.",
    descriptions: cashManagementToolDescriptions.explain_cashbook_term,
    kind: "server",
    inputSchema: ExplainCashbookTermToolInputSchema,
    execute: withWorkspaceContext(deps, [], async ({ input }) => {
      const parsed = ExplainCashbookTermToolInputSchema.safeParse(input);
      if (!parsed.success) {
        return validationError(parsed.error.flatten());
      }

      const { term, locale } = parsed.data;

      // Layer 1: Exact match
      let match = resolveGlossaryEntry(term, locale);

      // Layer 2: Fuzzy match (length-aware Levenshtein)
      if (!match) {
        match = fuzzyResolveGlossaryEntry(term, locale);
      }

      if (!match) {
        return failure("NOT_FOUND", "No glossary entry was found for that term", {
          supportedTerms: Object.values(glossary).map(
            (item) => item[locale]?.title || item.en.title
          ),
        });
      }

      return {
        ok: true,
        term: match.content.title,
        canonicalKey: match.canonicalKey,
        matchType: match.matchType,
        matchedAlias: match.matchedAlias,
        confidence: match.confidence,
        ...match.content,
      };
    }),
  },
  {
    name: "get_workflow_help",
    description:
      "Explain the next steps for closing the day, fixing receipts, or preparing monthly export.",
    descriptions: cashManagementToolDescriptions.get_workflow_help,
    kind: "server",
    inputSchema: WorkflowHelpToolInputSchema,
    execute: withWorkspaceContext(
      deps,
      [],
      async ({ tenantId, workspaceId, userId, input, toolCallId, runId, workspaceCtx }) => {
        const parsed = WorkflowHelpToolInputSchema.safeParse(input);
        if (!parsed.success) {
          return validationError(parsed.error.flatten());
        }

        const register = await resolveRegister(
          deps,
          { tenantId, workspaceId, userId, toolCallId, runId },
          parsed.data.registerId
        );
        if (isToolFailure(register)) {
          return register;
        }

        const status = await buildTodayStatus(
          deps,
          { tenantId, workspaceId, userId, toolCallId, runId },
          register,
          toDayKey(parsed.data.dayKey)
        );
        if (isToolFailure(status)) {
          return status;
        }

        const topic = parsed.data.topic;
        if (topic === "close-day") {
          return {
            ok: true,
            topic,
            summary:
              "To close the day, counted cash must be entered and blocking issues must be cleared.",
            steps: [
              "Check that receipt-required expense entries have attachments.",
              "Enter counted cash or denomination counts.",
              "Add a note if counted cash differs from the expected balance.",
              "Run close_cash_day when the status is ready.",
            ],
            blockers: status.blockers,
          };
        }

        if (topic === "missing-receipts") {
          return {
            ok: true,
            topic,
            summary: "Missing receipts block trust and can block monthly export.",
            steps: [
              "Upload the receipt file with upload_receipt.",
              "Attach it to the correct entry with attach_receipt_to_entry.",
              "Re-run find_missing_receipts to confirm nothing is left.",
            ],
            blockers: status.missingReceipts.map((entry) => ({
              entryId: entry.id,
              description: entry.description,
              amountCents: entry.amount,
            })),
          };
        }

        if (topic === "balance-difference") {
          return {
            ok: true,
            topic,
            summary:
              "A balance difference means counted cash does not match the expected drawer balance.",
            steps: [
              "Review the latest entries and look for wrong amounts or wrong directions.",
              "Check private deposits or withdrawals entered today.",
              "If the count is correct but still different, add a note before closing.",
            ],
            differenceCents: status.differenceCents,
          };
        }

        if (topic === "monthly-export") {
          const exportStatus = await buildMonthExportStatus(
            deps,
            { tenantId, workspaceId, userId, toolCallId, runId },
            register.id,
            status.monthKey
          );
          if (isToolFailure(exportStatus)) {
            return exportStatus;
          }
          return {
            ok: true,
            topic,
            summary: exportStatus.ready
              ? "This month is ready to export."
              : "Monthly export is still blocked by operational issues.",
            steps: [
              "Close every day that has entries.",
              "Attach missing receipts for expense and correction entries.",
              "Resolve remaining review items before generating the export.",
            ],
            blockingReason: exportStatus.blockingReason,
            openDays: exportStatus.openDays,
          };
        }

        return {
          ok: true,
          topic: "general",
          summary:
            "Use the cash assistant to check status, fix missing receipts, and finish day close safely.",
          nextBestActions: [
            { tool: "get_dashboard_summary", why: "See today's cash and export readiness." },
            { tool: "get_action_required", why: "See the next operational tasks." },
            { tool: "find_missing_receipts", why: "Fix the most common day-close blocker." },
          ],
        };
      }
    ),
  },
  {
    name: "get_cash_report_preview",
    description: "Return a structured Kassenbericht preview.",
    descriptions: cashManagementToolDescriptions.get_cash_report_preview,
    kind: "server",
    inputSchema: GetCashReportPreviewToolInputSchema,
    execute: withWorkspaceContext(
      deps,
      ["DAILY_CASH_DAY"],
      async ({ tenantId, workspaceId, userId, input, toolCallId, runId, workspaceCtx }) => {
        const parsed = GetCashReportPreviewToolInputSchema.safeParse(input);
        if (!parsed.success) {
          return validationError(parsed.error.flatten());
        }
        const register = await resolveRegister(
          deps,
          { tenantId, workspaceId, userId, toolCallId, runId },
          parsed.data.registerId
        );
        if (isToolFailure(register)) {
          return register;
        }
        return mapToolResult(
          await deps.getReportPreview.execute(
            {
              registerId: register.id,
              businessDate: toDayKey(parsed.data.businessDate),
            },
            getCtx({ tenantId, workspaceId, userId, toolCallId, runId })
          )
        );
      }
    ),
  },
  {
    name: "get_monthly_cash_report",
    description: "Get a structured read-only monthly Kassenabrechnung.",
    descriptions: cashManagementToolDescriptions.get_monthly_cash_report,
    kind: "server",
    inputSchema: GetMonthlyCashReportQuerySchema,
    execute: withWorkspaceContext(
      deps,
      ["MONTHLY_REVIEW"],
      async ({ tenantId, workspaceId, userId, input, toolCallId, runId, workspaceCtx }) => {
        const parsed = GetMonthlyCashReportQuerySchema.safeParse(input);
        if (!parsed.success) {
          return validationError(parsed.error.flatten());
        }
        return mapToolResult(
          await deps.getMonthlyReport.execute(
            parsed.data,
            getCtx({ tenantId, workspaceId, userId, toolCallId, runId })
          )
        );
      }
    ),
  },
  {
    name: "request_cash_clarification",
    description:
      "Request clarification from the user when a material cash fact is ambiguous before proceeding.",
    descriptions: cashManagementToolDescriptions.request_cash_clarification,
    kind: "client-auto",
    inputSchema: RequestCashClarificationInputSchema,
  },
];
