import { Logger } from "@nestjs/common";
import { z } from "zod";
import {
  CashDayCloseStatus,
  CashEntryDirection,
  CashEntryType,
  CashEntrySource,
  type CashPaymentMethod,
  type CashDayClose,
  type CashEntry,
  localDateSchema,
} from "@corely/contracts";
import { isErr, ok, err, type Result, type UseCaseError } from "@corely/kernel";
import { type DomainToolPort } from "../../../ai-copilot/application/ports/domain-tool.port";
import { buildToolCtx, validationError } from "../../../ai-copilot/infrastructure/tools/tool-utils";
import { mapToolResult } from "../../../../shared/adapters/tools/tool-mappers";
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
import { type PrepareCashEntryConfirmationUseCase } from "../../application/use-cases/prepare-cash-entry-confirmation.usecase";
import { type ConfirmCashEntryUseCase } from "../../application/use-cases/confirm-cash-entry.usecase";
import { type OpenCashDayWorkspaceUseCase } from "../../application/use-cases/copilot/open-cash-day-workspace.usecase";
import { type GetMonthlyCashReportQueryUseCase } from "../../application/use-cases/get-monthly-cash-report.query";
import { type ExportCashBookUseCase } from "../../application/use-cases/export-cash-book.usecase";
import { type ResolveCashMovementNextActionUseCase } from "../../application/use-cases/copilot/resolve-cash-movement-next-action.usecase";

export type ToolFailure = {
  ok: false;
  code: string;
  message: string;
  details?: unknown;
};

export type ToolCtx = {
  tenantId: string;
  workspaceId?: string;
  userId: string;
  toolCallId?: string;
  runId?: string;
  workspaceCtx?: CashAssistantExecutionContext | null;
};

export type CashStatusCode = "OPEN" | "NEEDS_REVIEW" | "READY_TO_CLOSE" | "CLOSED";

export const cashToolsLogger = new Logger("CashManagementTools");

export type CashToolDeps = {
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
  prepareEntryConfirmation: PrepareCashEntryConfirmationUseCase;
  confirmEntry: ConfirmCashEntryUseCase;
  openCashDayWorkspace: OpenCashDayWorkspaceUseCase;
  getMonthlyReport: GetMonthlyCashReportQueryUseCase;
  documentsApp: DocumentsApplication;
  workspaceRepo: CashWorkspaceRepoPort;
  resolveNextAction: ResolveCashMovementNextActionUseCase;
};

export type CashAssistantExecutionContext = {
  type: CashAssistantWorkspaceType;
  registerId: string | null;
  locationId: string | null;
  businessDate: Date | null;
  businessMonth: Date | null;
};

export const MonthKeySchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Expected YYYY-MM");
export const RegisterScopedSchema = z.object({});

export const CountedCashToolInputBaseSchema = RegisterScopedSchema.extend({
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

const receiptRequiredTypes = new Set<string>([
  CashEntryType.EXPENSE_CASH,
  CashEntryType.REFUND_CASH,
  CashEntryType.BANK_DEPOSIT,
  CashEntryType.BANK_WITHDRAWAL,
  CashEntryType.CORRECTION,
  CashEntryType.CLOSING_ADJUSTMENT,
  CashEntryType.OUT,
]);

export const suspiciousEntryTypes = new Set<string>([
  CashEntryType.CORRECTION,
  CashEntryType.CLOSING_ADJUSTMENT,
  CashEntryType.IN,
  CashEntryType.OUT,
]);

export const failure = (code: string, message: string, details?: unknown): ToolFailure => ({
  ok: false,
  code,
  message,
  details,
});

export const toMonthKey = (dayKey: string): string => dayKey.slice(0, 7);

export const toDayKey = (value?: string): string => {
  if (value) {
    return value.slice(0, 10);
  }
  return new Date().toISOString().slice(0, 10);
};

export const monthRange = (monthKey: string) => {
  const [year, month] = monthKey.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return {
    dayKeyFrom: `${monthKey}-01`,
    dayKeyTo: `${monthKey}-${String(lastDay).padStart(2, "0")}`,
  };
};

export const signedAmount = (entry: CashEntry): number =>
  entry.direction === CashEntryDirection.OUT ? -entry.amount : entry.amount;

export const requiresReceipt = (entry: CashEntry): boolean => receiptRequiredTypes.has(entry.type);

export const isSubmittedDayClose = (status: CashDayClose["status"] | "OPEN"): boolean =>
  status === CashDayCloseStatus.SUBMITTED;

export const isToolFailure = (value: unknown): value is ToolFailure =>
  typeof value === "object" &&
  value !== null &&
  "ok" in value &&
  (value as { ok?: unknown }).ok === false &&
  "message" in value;

export const unwrapResult = <T extends Record<string, unknown>>(
  result: Result<T, UseCaseError> | undefined | null
): T | ToolFailure => {
  if (!result) {
    return failure("INTERNAL_ERROR", "Unexpected undefined result from use case");
  }
  if (isErr(result)) {
    return failure(
      result.error.code ?? "UNKNOWN_ERROR",
      result.error.message,
      result.error.details
    );
  }
  return result.value;
};

export const toCashToolCtx = (params: {
  tenantId: string;
  workspaceId?: string;
  userId: string;
  toolCallId?: string;
  runId?: string;
  workspaceCtx: CashAssistantExecutionContext | null;
}): ToolCtx => params;

export const getCtx = (params: ToolCtx) =>
  buildToolCtx({
    tenantId: params.tenantId,
    workspaceId: params.workspaceId,
    userId: params.userId,
    toolCallId: params.toolCallId,
    runId: params.runId,
  });

export const withWorkspaceContext =
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
    try {
      let workspaceCtx: CashAssistantExecutionContext | null =
        (params as { workspaceCtx?: CashAssistantExecutionContext | null }).workspaceCtx ?? null;

      if (!workspaceCtx && params.tenantId && params.workspaceId && params.runId) {
        try {
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
        } catch (wsErr) {
          cashToolsLogger.warn(
            `Failed to load workspace context for runId=${params.runId}: ${
              wsErr instanceof Error ? wsErr.message : String(wsErr)
            }`
          );
          // Non-fatal: proceed without workspace context
        }
      }

      if (
        workspaceCtx &&
        workspaceCtx.type !== "GENERAL_HELP" &&
        allowedTypes.length > 0 &&
        !allowedTypes.includes(workspaceCtx.type)
      ) {
        return failure(
          "UNAUTHORIZED_TOOL",
          `This tool is not allowed in ${workspaceCtx.type} workspaces.`
        );
      }

      return await handler({ ...params, workspaceCtx });
    } catch (err) {
      cashToolsLogger.error(
        `Unhandled exception in tool execute (tenantId=${params.tenantId} runId=${params.runId}): ${
          err instanceof Error ? err.message : String(err)
        }`,
        err instanceof Error ? err.stack : undefined
      );
      return failure("INTERNAL_ERROR", "An unexpected error occurred while executing the tool");
    }
  };

export const CreateCashEntryToolInputSchema = RegisterScopedSchema.extend({
  description: z.string().min(1),
  amountCents: z.number().int().positive(),
  type: z
    .nativeEnum(CashEntryType)
    .optional()
    .describe(
      "The type of cash movement. CRITICAL: Use 'SALE_CASH' for sales. NEVER use 'IN' or 'OUT' as they break reporting."
    ),
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

export const UpdateCashEntryToolInputSchema = z
  .object({
    entryId: z.string().min(1),
    reason: z.string().min(1),
    description: z.string().min(1).optional(),
    amountCents: z.number().int().positive().optional(),
    type: z
      .nativeEnum(CashEntryType)
      .optional()
      .describe(
        "The type of cash movement. CRITICAL: Use 'SALE_CASH' for sales. NEVER use 'IN' or 'OUT' as they break reporting."
      ),
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

export const ListCashEntriesToolInputSchema = RegisterScopedSchema.extend({
  dayKeyFrom: localDateSchema.optional(),
  dayKeyTo: localDateSchema.optional(),
  type: z.nativeEnum(CashEntryType).optional().describe("The type of cash movement to filter by."),
  source: z.string().min(1).optional(),
  paymentMethod: z.string().min(1).optional(),
  q: z.string().min(1).optional(),
});

export const UploadReceiptToolInputSchema = z
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

export const AttachReceiptToolInputSchema = z
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

export const CountedCashToolInputSchema = CountedCashToolInputBaseSchema.superRefine(
  (value, ctx) => {
    if (value.countedBalanceCents === undefined && value.denominationCounts.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "countedBalanceCents or denominationCounts is required",
        path: ["countedBalanceCents"],
      });
    }
  }
);

export const CloseCashDayToolInputSchema = CountedCashToolInputBaseSchema.partial({
  countedBalanceCents: true,
  denominationCounts: true,
}).extend({
  dayKey: localDateSchema.optional(),
  note: z.string().optional(),
  idempotencyKey: z.string().min(1).optional(),
});

export const ListUnclosedDaysToolInputSchema = RegisterScopedSchema.extend({
  dayKeyFrom: localDateSchema.optional(),
  dayKeyTo: localDateSchema.optional(),
});

export const FindMissingReceiptsToolInputSchema = RegisterScopedSchema.extend({
  dayKeyFrom: localDateSchema.optional(),
  dayKeyTo: localDateSchema.optional(),
});

export const GenerateMonthlyExportToolInputSchema = RegisterScopedSchema.extend({
  month: MonthKeySchema.optional(),
  format: z.any().optional().default("DATEV"), // TODO: Use ExportCashBookFormatSchema
  includeAttachmentFiles: z.boolean().optional().default(false),
  idempotencyKey: z.string().min(1).optional(),
});

export const DashboardSummaryToolInputSchema = RegisterScopedSchema.extend({
  dayKey: localDateSchema.optional(),
});

export const ActionRequiredToolInputSchema = RegisterScopedSchema.extend({
  dayKey: localDateSchema.optional(),
});

export const ExplainCashbookTermToolInputSchema = z.object({
  term: z.string().min(1),
  locale: z.enum(["en", "de", "vi"]).optional().default("en"),
});

export const WorkflowHelpToolInputSchema = RegisterScopedSchema.extend({
  topic: z
    .enum(["close-day", "missing-receipts", "balance-difference", "monthly-export", "general"])
    .optional()
    .default("general"),
  dayKey: localDateSchema.optional(),
  locale: z.enum(["en", "de", "vi"]).optional().default("en"),
});

export const GetCashReportPreviewToolInputSchema = RegisterScopedSchema.extend({
  businessDate: localDateSchema.optional(),
});

export { validationError, mapToolResult, buildToolCtx, isErr, ok, err };

export {
  ExportCashBookFormatSchema,
  PrepareCashDayConfirmationInputSchema,
  ConfirmCashDayDraftInputSchema,
  GetMonthlyCashReportQuerySchema,
  RequestCashClarificationInputSchema,
  PrepareCashEntryConfirmationInputSchema,
  ConfirmCashEntryInputSchema,
  OpenCashDayWorkspaceInputSchema,
  viewKassenberichtInputSchema,
  viewKassenberichtOutputSchema,
  CashMovementExtractionSchema,
  type AnalyzeCashMovementResult,
} from "@corely/contracts";

export * from "./cash-tools.helpers";
