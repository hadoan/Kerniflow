import { z } from "zod";
import { type DomainToolPort } from "../../../ai-copilot/application/ports/domain-tool.port";
import { CashEntrySource, type CashPaymentMethod, type CashEntry, type CashDayClose } from "@corely/contracts";
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

export const generate_monthly_exportTool = (deps: CashToolDeps): DomainToolPort => ({
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

        const monthKey = parsed.data.month ?? toMonthKey(toDayKey());
        const exportStatus = await buildMonthExportStatus(deps, toolCtx, register.id, monthKey);
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
            getCtx(toolCtx)
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
  });

export const get_dashboard_summaryTool = (deps: CashToolDeps): DomainToolPort => ({
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
  });

export const get_cash_report_previewTool = (deps: CashToolDeps): DomainToolPort => ({
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
          await deps.getReportPreview.execute(
            {
              registerId: register.id,
              businessDate: toDayKey(parsed.data.businessDate),
            },
            getCtx(toolCtx)
          )
        );
      }
    ),
  });

export const get_monthly_cash_reportTool = (deps: CashToolDeps): DomainToolPort => ({
    name: "get_monthly_cash_report",
    description: "Get a structured read-only monthly Kassenabrechnung.",
    descriptions: cashManagementToolDescriptions.get_monthly_cash_report,
    kind: "server",
    inputSchema: GetMonthlyCashReportQuerySchema.omit({ registerId: true }),
    execute: withWorkspaceContext(
      deps,
      ["MONTHLY_REVIEW"],
      async ({ tenantId, workspaceId, userId, input, toolCallId, runId, workspaceCtx }) => {
        const parsed = GetMonthlyCashReportQuerySchema.omit({ registerId: true }).safeParse(input);
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
          await deps.getMonthlyReport.execute(
            { ...parsed.data, registerId: register.id },
            getCtx(toolCtx)
          )
        );
      }
    ),
  });

export const view_kassenberichtTool = (deps: CashToolDeps): DomainToolPort => ({
    name: "view_kassenbericht",
    description:
      "Render a link to a daily Kassenbericht for the cash register associated with the current Cash Assistant workspace. Use this when the user asks to view, open, or navigate to a Kassenbericht. This tool does not create, change, close, or recalculate a Kassenbericht.",
    kind: "server",
    inputSchema: viewKassenberichtInputSchema,
    execute: withWorkspaceContext(
      deps,
      ["GENERAL_HELP", "DAILY_CASH_DAY", "MONTHLY_REVIEW"],
      async ({ tenantId, workspaceId, userId, input, toolCallId, runId, workspaceCtx }) => {
        const parsed = viewKassenberichtInputSchema.safeParse(input);
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
          return {
            ok: false,
            error: {
              code: "CashManagement:RegisterContextRequired",
              message: "No cash register is associated with this conversation.",
            },
          };
        }

        let day = parsed.data.day;
        if (!day) {
          console.log("DEBUG: workspaceCtx =", workspaceCtx);
          if (workspaceCtx?.businessDate) {
            day = toDayKey(
              typeof workspaceCtx.businessDate === "string"
                ? workspaceCtx.businessDate
                : workspaceCtx.businessDate.toISOString()
            );
          } else {
            // "3. Today’s local date in the tenant or workspace timezone. 4. Use Europe/Berlin only as a controlled fallback when no configured timezone exists."
            const tz = "Europe/Berlin";
            const formatter = new Intl.DateTimeFormat("en-CA", {
              timeZone: tz,
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
            });
            day = formatter.format(new Date());
          }
        }

        const result = {
          type: "cash.view-kassenbericht" as const,
          version: 1 as const,
          registerId: register.id,
          day,
        };

        const validatedResult = viewKassenberichtOutputSchema.safeParse(result);
        if (!validatedResult.success) {
          return validationError(validatedResult.error.flatten());
        }

        return {
          ok: true,
          result: validatedResult.data,
        };
      }
    ),
  });