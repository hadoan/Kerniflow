import { z } from "zod";
import { type DomainToolPort } from "../../../ai-copilot/application/ports/domain-tool.port";
import {
  type CashEntrySource,
  type CashPaymentMethod,
  type CashEntry,
  type CashDayClose,
} from "@corely/contracts";
import {
  getDayCloseOrNull,
  listEntriesForRange,
  listAttachmentsByEntry,
} from "./cash-tools.helpers";
import {
  type CashToolDeps,
  withWorkspaceContext,
  validationError,
  failure,
  mapToolResult,
  toCashToolCtx,
  getCtx,
  unwrapResult,
  isToolFailure,
  resolveRegister,
  assertEntryMatchesBoundRegister,
  buildTodayStatus,
  buildMonthExportStatus,
  toDayKey,
  toMonthKey,
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
  requiresReceipt,
} from "./cash-tools.shared";
import { cashManagementToolDescriptions } from "./cash-management.tool-copy";
import {
  extractLatestUserAttachments,
  normalizeAttachment,
} from "../../../../shared/adapters/tools/file-parts";
import {
  resolveGlossaryEntry,
  fuzzyResolveGlossaryEntry,
  glossary,
} from "./cash-management.glossary";

// Add specific schemas and imports here

export const update_cash_entryTool = (deps: CashToolDeps): DomainToolPort => ({
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
      const registerMismatch = assertEntryMatchesBoundRegister(original, workspaceCtx);
      if (registerMismatch) {
        return registerMismatch;
      }
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
});

export const list_cash_entriesTool = (deps: CashToolDeps): DomainToolPort => ({
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

      const result = unwrapResult(
        await deps.listEntries.execute({ registerId: register.id, ...parsed.data }, getCtx(toolCtx))
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
});

export const prepare_cash_entry_confirmationTool = (deps: CashToolDeps): DomainToolPort => ({
  name: "prepare_cash_entry_confirmation",
  description: "Prepare an entry confirmation record to safely transition state to the frontend.",
  descriptions: cashManagementToolDescriptions.prepare_cash_entry_confirmation,
  kind: "server",
  inputSchema: PrepareCashEntryConfirmationInputSchema.omit({
    tenantId: true,
    workspaceId: true,
    registerId: true,
  }),
  execute: withWorkspaceContext(
    deps,
    ["DAILY_CASH_DAY"],
    async ({ tenantId, workspaceId, userId, input, toolCallId, runId, workspaceCtx }) => {
      const parsed = PrepareCashEntryConfirmationInputSchema.omit({
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
        await deps.prepareEntryConfirmation.execute(
          { ...parsed.data, registerId: register.id },
          getCtx(toolCtx)
        )
      );
    }
  ),
});

export const confirm_cash_entryTool = (deps: CashToolDeps): DomainToolPort => ({
  name: "confirm_cash_entry",
  description: "Submit a confirmed cash entry idempotently.",
  descriptions: cashManagementToolDescriptions.confirm_cash_entry,
  kind: "server",
  inputSchema: ConfirmCashEntryInputSchema.omit({
    tenantId: true,
    workspaceId: true,
    registerId: true,
  }),
  execute: withWorkspaceContext(
    deps,
    ["DAILY_CASH_DAY"],
    async ({ tenantId, workspaceId, userId, input, toolCallId, runId, workspaceCtx }) => {
      const parsed = ConfirmCashEntryInputSchema.omit({
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
        await deps.confirmEntry.execute(
          { ...parsed.data, registerId: register.id },
          getCtx(toolCtx)
        )
      );
    }
  ),
});
