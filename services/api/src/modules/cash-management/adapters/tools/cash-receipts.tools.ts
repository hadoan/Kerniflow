import { z } from "zod";
import { type DomainToolPort } from "../../../ai-copilot/application/ports/domain-tool.port";
import {
  CashEntrySource,
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

export const upload_receiptTool = (deps: CashToolDeps): DomainToolPort => ({
  name: "upload_receipt",
  description:
    "Upload one or more receipt files from the latest user attachment or explicit base64 input.",
  descriptions: cashManagementToolDescriptions.upload_receipt,
  kind: "server",
  inputSchema: UploadReceiptToolInputSchema,
  execute: withWorkspaceContext(
    deps,
    ["DAILY_CASH_DAY", "MONTHLY_REVIEW"],
    async ({ tenantId, workspaceId, userId, input, toolCallId, runId, messages, workspaceCtx }) => {
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
              getCtx({ tenantId, workspaceId, userId, toolCallId, runId, workspaceCtx })
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
            getCtx({ tenantId, workspaceId, userId, toolCallId, runId, workspaceCtx })
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
});

export const attach_receipt_to_entryTool = (deps: CashToolDeps): DomainToolPort => ({
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

      const toolCtx = toCashToolCtx({
        tenantId,
        workspaceId,
        userId,
        toolCallId,
        runId,
        workspaceCtx,
      });
      const entryResult = unwrapResult(
        await deps.getEntry.execute({ entryId: parsed.data.entryId }, getCtx(toolCtx))
      );
      if (isToolFailure(entryResult)) {
        return entryResult;
      }
      const registerMismatch = assertEntryMatchesBoundRegister(entryResult.entry, workspaceCtx);
      if (registerMismatch) {
        return registerMismatch;
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
            getCtx(toolCtx)
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
});

export const find_missing_receiptsTool = (deps: CashToolDeps): DomainToolPort => ({
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

      const candidates = entries.filter(requiresReceipt);
      const attachmentCounts = await listAttachmentsByEntry(deps, toolCtx, candidates);
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
});
