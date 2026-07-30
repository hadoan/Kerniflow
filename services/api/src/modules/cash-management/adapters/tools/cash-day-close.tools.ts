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

export const prepare_cash_day_confirmationTool = (deps: CashToolDeps): DomainToolPort => ({
    name: "prepare_cash_day_confirmation",
    description:
      "Generate a pending confirmation for closing the day with proposed cash entries and actual counted balance.",
    descriptions: cashManagementToolDescriptions.prepare_cash_day_confirmation,
    kind: "server",
    inputSchema: PrepareCashDayConfirmationInputSchema.omit({
      tenantId: true,
      workspaceId: true,
      registerId: true,
    }),
    execute: withWorkspaceContext(
      deps,
      ["DAILY_CASH_DAY"],
      async ({ tenantId, workspaceId, userId, input, toolCallId, runId, workspaceCtx }) => {
        const parsed = PrepareCashDayConfirmationInputSchema.omit({
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
          await deps.prepareConfirmation.execute(
            { ...parsed.data, registerId: register.id },
            getCtx(toolCtx)
          )
        );
      }
    ),
  });

export const get_today_cash_statusTool = (deps: CashToolDeps): DomainToolPort => ({
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
  });

export const confirm_cash_day_draftTool = (deps: CashToolDeps): DomainToolPort => ({
    name: "confirm_cash_day_draft",
    description:
      "Confirm a previously prepared cash day draft by atomically saving the proposed movements and submitting the counted cash.",
    descriptions: cashManagementToolDescriptions.confirm_cash_day_draft,
    kind: "server",
    inputSchema: ConfirmCashDayDraftInputSchema.omit({
      tenantId: true,
      workspaceId: true,
      registerId: true,
    }),
    execute: withWorkspaceContext(
      deps,
      ["DAILY_CASH_DAY"],
      async ({ tenantId, workspaceId, userId, input, toolCallId, runId, workspaceCtx }) => {
        const parsed = ConfirmCashDayDraftInputSchema.omit({
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
          await deps.confirmDraft.execute(
            { ...parsed.data, registerId: register.id },
            getCtx(toolCtx)
          )
        );
      }
    ),
  });

export const close_cash_dayTool = (deps: CashToolDeps): DomainToolPort => ({
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

        const dayKey = toDayKey(parsed.data.dayKey);
        const existingDayClose = await getDayCloseOrNull(deps, toolCtx, register.id, dayKey);
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
  });

export const list_unclosed_daysTool = (deps: CashToolDeps): DomainToolPort => ({
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

        const dayKeyTo = parsed.data.dayKeyTo ?? toDayKey();
        const dayKeyFrom = parsed.data.dayKeyFrom ?? `${dayKeyTo.slice(0, 7)}-01`;
        const entries = await listEntriesForRange(deps, toolCtx, register.id, {
          dayKeyFrom,
          dayKeyTo,
        });
        if (isToolFailure(entries)) {
          return entries;
        }

        const closesResult = unwrapResult(
          await deps.listDayCloses.execute(
            { registerId: register.id, dayKeyFrom, dayKeyTo },
            getCtx(toolCtx)
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
  });