import { z } from "zod";
import { type DomainToolPort } from "../../../ai-copilot/application/ports/domain-tool.port";
import { CashEntrySource, type CashPaymentMethod, type CashEntry, type CashDayClose, RequestCashClarificationInputSchema } from "@corely/contracts";
import { getDayCloseOrNull, listEntriesForRange, listAttachmentsByEntry } from "./cash-tools.helpers";
import { 
  type CashToolDeps, withWorkspaceContext, validationError, failure, mapToolResult, toCashToolCtx, getCtx, unwrapResult, isToolFailure, resolveRegister, assertEntryMatchesBoundRegister, buildTodayStatus, buildMonthExportStatus, toDayKey, toMonthKey,
  PrepareCashDayConfirmationInputSchema,
  ConfirmCashDayDraftInputSchema,
  CloseCashDayToolInputSchema,
  DashboardSummaryToolInputSchema,
  ListUnclosedDaysToolInputSchema,
  UpdateCashEntryToolInputSchema,
  ListCashEntriesToolInputSchema,
  PrepareCashEntryConfirmationInputSchema,
  ConfirmCashEntryInputSchema,
  UploadReceiptToolInputSchema,
  AttachReceiptToolInputSchema,
  FindMissingReceiptsToolInputSchema,
  GenerateMonthlyExportToolInputSchema,
  GetCashReportPreviewToolInputSchema,
  GetMonthlyCashReportQuerySchema,
  viewKassenberichtInputSchema,
  viewKassenberichtOutputSchema,
  CashMovementExtractionSchema,
  ActionRequiredToolInputSchema,
  ExplainCashbookTermToolInputSchema,
  WorkflowHelpToolInputSchema,
  OpenCashDayWorkspaceInputSchema,
  isSubmittedDayClose,
  requiresReceipt
} from "./cash-tools.shared";
import { cashManagementToolDescriptions } from "./cash-management.tool-copy";
import { extractLatestUserAttachments, normalizeAttachment } from "../../../../shared/adapters/tools/file-parts";
import { resolveGlossaryEntry, fuzzyResolveGlossaryEntry, glossary } from "./cash-management.glossary";

// Add specific schemas and imports here

export const get_action_requiredTool = (deps: CashToolDeps): DomainToolPort => ({
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

        const toolCtx = toCashToolCtx({
          tenantId,
          workspaceId,
          userId,
          toolCallId,
          runId,
          workspaceCtx,
        });
        const register = await resolveRegister(deps, toolCtx);
        if (isToolFailure(register)) {
          return register;
        }

        const status = await buildTodayStatus(
          deps,
          toolCtx,
          register,
          toDayKey(parsed.data.dayKey)
        );
        if (isToolFailure(status)) {
          return status;
        }

        const exportStatus = await buildMonthExportStatus(
          deps,
          toolCtx,
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
  });

export const request_cash_clarificationTool = (deps: CashToolDeps): DomainToolPort => ({
    name: "request_cash_clarification",
    description:
      "Ask for exactly one unresolved material cash fact, then wait for the user's answer. Call this tool at most once per assistant response. Never ask for a fact already stated by the user or deterministically derivable from those stated facts.",
    descriptions: cashManagementToolDescriptions.request_cash_clarification,
    kind: "client-auto",
    inputSchema: RequestCashClarificationInputSchema,
  });

export const analyze_cash_movementTool = (deps: CashToolDeps): DomainToolPort => ({
    name: "analyze_cash_movement",
    description: "Analyze a cash movement to determine the next operational action.",
    descriptions: cashManagementToolDescriptions.analyze_cash_movement,
    kind: "server",
    inputSchema: CashMovementExtractionSchema,
    execute: withWorkspaceContext(
      deps,
      ["DAILY_CASH_DAY"],
      async ({ tenantId, workspaceId, userId, input, toolCallId, runId, workspaceCtx }) => {
        const parsed = CashMovementExtractionSchema.safeParse(input);
        if (!parsed.success) {
          return validationError(parsed.error.flatten());
        }

        const result = await deps.resolveNextAction.execute(
          { extraction: parsed.data, intent: "CASH_MOVEMENT" },
          getCtx({ tenantId, workspaceId, userId, toolCallId, runId })
        );

        return unwrapResult(result);
      }
    ),
  });

export const open_cash_day_workspaceTool = (deps: CashToolDeps): DomainToolPort => ({
    name: "open_cash_day_workspace",
    description: "Handoff to the DAILY_CASH_DAY workspace from a general workspace context.",
    descriptions: cashManagementToolDescriptions.open_cash_day_workspace,
    kind: "client-auto", // Client needs to handle navigation
    inputSchema: OpenCashDayWorkspaceInputSchema.omit({
      tenantId: true,
      workspaceId: true,
      registerId: true,
    }),
    execute: withWorkspaceContext(
      deps,
      ["GENERAL_HELP", "MONTHLY_REVIEW"],
      async ({ tenantId, workspaceId, userId, input, toolCallId, runId, workspaceCtx }) => {
        const parsed = OpenCashDayWorkspaceInputSchema.omit({
          tenantId: true,
          workspaceId: true,
          registerId: true,
        }).safeParse(input);
        if (!parsed.success) {
          return validationError(parsed.error.flatten());
        }
        const toolCtx = toCashToolCtx({
          tenantId,
          workspaceId,
          userId,
          toolCallId,
          runId,
          workspaceCtx,
        });
        const register = await resolveRegister(deps, toolCtx);
        if (isToolFailure(register)) {
          return register;
        }
        return mapToolResult(
          await deps.openCashDayWorkspace.execute(
            { ...parsed.data, registerId: register.id },
            getCtx(toolCtx)
          )
        );
      }
    ),
  });