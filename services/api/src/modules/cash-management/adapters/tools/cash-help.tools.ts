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

export const explain_cashbook_termTool = (deps: CashToolDeps): DomainToolPort => ({
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
  });

export const get_workflow_helpTool = (deps: CashToolDeps): DomainToolPort => ({
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
            toolCtx,
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
  });