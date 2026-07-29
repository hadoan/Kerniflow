import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  CashDayCloseStatus,
  CashEntryDirection,
  CashEntrySource,
  CashEntryType,
  CashPaymentMethod,
  type CashDayClose,
  type CashEntry,
  type CashRegister,
} from "@corely/contracts";
import { err, NotFoundError, ok } from "@corely/kernel";
import { buildCashManagementTools, resolveRegister } from "./cash-management.tools";
import { type DocumentsApplication } from "../../../documents/application/documents.application";

const register: CashRegister = {
  id: "reg-1",
  tenantId: "tenant-1",
  workspaceId: "ws-1",
  name: "Front Desk",
  location: "Berlin",
  currency: "EUR",
  currentBalanceCents: 42000,
  disallowNegativeBalance: false,
  createdAt: new Date("2026-03-14T08:00:00.000Z").toISOString(),
  updatedAt: new Date("2026-03-14T08:00:00.000Z").toISOString(),
};

const baseEntry = (overrides: Partial<CashEntry> = {}): CashEntry => ({
  id: "entry-1",
  tenantId: "tenant-1",
  workspaceId: "ws-1",
  registerId: "reg-1",
  entryNo: 1,
  occurredAt: "2026-03-14T09:00:00.000Z",
  description: "Cash sale",
  type: CashEntryType.SALE_CASH,
  direction: CashEntryDirection.IN,
  source: CashEntrySource.MANUAL,
  paymentMethod: CashPaymentMethod.CASH,
  grossAmountCents: 12000,
  netAmountCents: 12000,
  taxAmountCents: 0,
  taxMode: "NONE",
  taxCodeId: null,
  taxCode: null,
  taxRateBps: null,
  taxLabel: null,
  tax: {
    mode: "NONE",
    grossAmountCents: 12000,
    netAmountCents: 12000,
    taxAmountCents: 0,
    taxCodeId: null,
    taxCode: null,
    taxRateBps: null,
    taxLabel: null,
  },
  amount: 12000,
  amountCents: 12000,
  currency: "EUR",
  dayKey: "2026-03-14",
  sourceDocumentId: null,
  sourceDocumentRef: null,
  sourceDocumentKind: null,
  sourceDocument: null,
  reversalOfEntryId: null,
  reversedByEntryId: null,
  lockedByDayCloseId: null,
  balanceAfterCents: 12000,
  referenceId: null,
  createdAt: "2026-03-14T09:00:00.000Z",
  createdByUserId: "user-1",
  sourceType: CashEntrySource.MANUAL,
  businessDate: "2026-03-14",
  ...overrides,
});

const draftDayClose: CashDayClose = {
  id: "close-1",
  tenantId: "tenant-1",
  workspaceId: "ws-1",
  registerId: "reg-1",
  dayKey: "2026-03-14",
  expectedBalance: 15000,
  countedBalance: 15000,
  difference: 0,
  submittedAt: null,
  submittedBy: null,
  status: CashDayCloseStatus.DRAFT,
  note: null,
  lockedAt: null,
  lockedByUserId: null,
  denominationCounts: [],
  createdAt: "2026-03-14T19:00:00.000Z",
  updatedAt: "2026-03-14T19:00:00.000Z",
  businessDate: "2026-03-14",
  expectedBalanceCents: 15000,
  countedBalanceCents: 15000,
  differenceCents: 0,
  closedAt: null,
  closedByUserId: null,
};

describe("cash-management tools", () => {
  const listRegistersExecute = vi.fn();
  const getRegisterExecute = vi.fn();
  const listEntriesExecute = vi.fn();
  const getEntryExecute = vi.fn();
  const createEntryExecute = vi.fn();
  const reverseEntryExecute = vi.fn();
  const getDayCloseExecute = vi.fn();
  const saveDayCountExecute = vi.fn();
  const submitDayCloseExecute = vi.fn();
  const listDayClosesExecute = vi.fn();
  const attachBelegExecute = vi.fn();
  const listAttachmentsExecute = vi.fn();
  const exportCashBookExecute = vi.fn();
  const uploadFileExecute = vi.fn();

  const getReportPreviewExecute = vi.fn();
  const prepareConfirmationExecute = vi.fn();
  const confirmDraftExecute = vi.fn();
  const getMonthlyReportExecute = vi.fn();

  const documentsApp = {
    uploadFile: { execute: uploadFileExecute },
  } as unknown as DocumentsApplication;

  const findWorkspaceByConversationId = vi.fn();
  const workspaceRepo = {
    findWorkspaceByConversationId,
  };

  const deps = {
    listRegisters: { execute: listRegistersExecute },
    getRegister: { execute: getRegisterExecute },
    listEntries: { execute: listEntriesExecute },
    getEntry: { execute: getEntryExecute },
    createEntry: { execute: createEntryExecute },
    reverseEntry: { execute: reverseEntryExecute },
    getDayClose: { execute: getDayCloseExecute },
    saveDayCount: { execute: saveDayCountExecute },
    submitDayClose: { execute: submitDayCloseExecute },
    listDayCloses: { execute: listDayClosesExecute },
    attachBeleg: { execute: attachBelegExecute },
    listAttachments: { execute: listAttachmentsExecute },
    exportCashBook: { execute: exportCashBookExecute },
    getReportPreview: { execute: getReportPreviewExecute },
    prepareConfirmation: { execute: prepareConfirmationExecute },
    confirmDraft: { execute: confirmDraftExecute },
    getMonthlyReport: { execute: getMonthlyReportExecute },
    documentsApp,
    workspaceRepo,
  } as unknown as CashToolDeps;

  beforeEach(() => {
    listRegistersExecute.mockReset();
    getRegisterExecute.mockReset();
    listEntriesExecute.mockReset();
    getEntryExecute.mockReset();
    createEntryExecute.mockReset();
    reverseEntryExecute.mockReset();
    getDayCloseExecute.mockReset();
    saveDayCountExecute.mockReset();
    submitDayCloseExecute.mockReset();
    listDayClosesExecute.mockReset();
    attachBelegExecute.mockReset();
  });

  describe("Register Resolution & Selection Rules", () => {
    const secondRegister: CashRegister = {
      ...register,
      id: "reg-2",
      name: "Back Office",
      location: "Hamburg",
    };

    it("resolves sole register automatically when exactly one register exists", async () => {
      listRegistersExecute.mockResolvedValue(ok({ registers: [register] }));
      listEntriesExecute.mockResolvedValue(ok({ entries: [] }));

      const tool = buildCashManagementTools(deps).find((t) => t.name === "list_cash_entries");
      const result = await tool?.execute?.({
        tenantId: "tenant-1",
        workspaceId: "ws-1",
        userId: "user-1",
        input: {},
      });

      expect(result).toEqual(expect.objectContaining({ ok: true, register }));
    });

    it("returns REGISTER_SELECTION_REQUIRED when multiple registers exist without workspace context", async () => {
      listRegistersExecute.mockResolvedValue(ok({ registers: [register, secondRegister] }));

      const tool = buildCashManagementTools(deps).find((t) => t.name === "list_cash_entries");
      const result = await tool?.execute?.({
        tenantId: "tenant-1",
        workspaceId: "ws-1",
        userId: "user-1",
        input: {},
      });

      expect(result).toEqual({
        ok: false,
        code: "REGISTER_SELECTION_REQUIRED",
        message: "Select a cash register before continuing.",
        details: {
          availableRegisters: [
            { id: "reg-1", name: "Front Desk", location: "Berlin" },
            { id: "reg-2", name: "Back Office", location: "Hamburg" },
          ],
        },
      });
    });

    it("uses persisted workspace register without calling listRegisters", async () => {
      const findWorkspaceByConversationId = vi.fn().mockResolvedValue({
        type: "GENERAL_HELP",
        registerId: "reg-2",
      });

      const customDeps = {
        ...deps,
        workspaceRepo: { findWorkspaceByConversationId },
      };

      getRegisterExecute.mockResolvedValue(ok({ register: secondRegister }));
      listEntriesExecute.mockResolvedValue(ok({ entries: [] }));

      const tool = buildCashManagementTools(customDeps as any).find(
        (t) => t.name === "list_cash_entries"
      );
      const result = await tool?.execute?.({
        tenantId: "tenant-1",
        workspaceId: "ws-1",
        userId: "user-1",
        runId: "conv-123",
        input: {},
      });

      expect(listRegistersExecute).not.toHaveBeenCalled();
      expect(getRegisterExecute).toHaveBeenCalledWith({ registerId: "reg-2" }, expect.anything());
      expect(result).toEqual(expect.objectContaining({ ok: true, register: secondRegister }));
    });

    it("rejects conflicting register input when workspace is already bound to a different register", async () => {
      const toolCtx = {
        tenantId: "tenant-1",
        workspaceId: "ws-1",
        userId: "user-1",
        workspaceCtx: { type: "GENERAL_HELP" as const, registerId: "reg-1" },
      };

      const result = await resolveRegister(deps, toolCtx, "reg-2");

      expect(result).toEqual({
        ok: false,
        code: "CONFLICT",
        message: "Cannot override the register bound to this conversation.",
      });
    });

    it("returns recoverable error when bound register no longer exists", async () => {
      const findWorkspaceByConversationId = vi.fn().mockResolvedValue({
        type: "GENERAL_HELP",
        registerId: "deleted-reg",
      });

      const customDeps = {
        ...deps,
        workspaceRepo: { findWorkspaceByConversationId },
      };

      getRegisterExecute.mockResolvedValue(err(new NotFoundError("register not found")));

      const tool = buildCashManagementTools(customDeps as any).find(
        (t) => t.name === "list_cash_entries"
      );
      const result = await tool?.execute?.({
        tenantId: "tenant-1",
        workspaceId: "ws-1",
        userId: "user-1",
        runId: "conv-123",
        input: {},
      });

      expect(result).toEqual({
        ok: false,
        code: "NOT_FOUND",
        message: "The bound cash register for this conversation could not be found.",
      });
    });

    it("allows GENERAL_HELP workspace with bound register to invoke cash tools", async () => {
      const findWorkspaceByConversationId = vi.fn().mockResolvedValue({
        type: "GENERAL_HELP",
        registerId: "reg-1",
      });

      const customDeps = {
        ...deps,
        workspaceRepo: { findWorkspaceByConversationId },
      };

      getRegisterExecute.mockResolvedValue(ok({ register }));
      listEntriesExecute.mockResolvedValue(ok({ entries: [] }));

      const tool = buildCashManagementTools(customDeps as any).find(
        (t) => t.name === "prepare_cash_day_confirmation"
      );

      prepareConfirmationExecute.mockResolvedValue(
        ok({ confirmation: { id: "c-1", status: "PENDING" } })
      );

      const result = await tool?.execute?.({
        tenantId: "tenant-1",
        workspaceId: "ws-1",
        userId: "user-1",
        runId: "conv-123",
        input: { businessDate: "2026-03-14", actualClosingCashCents: 10000 },
      });

      expect(result).toEqual(expect.objectContaining({ ok: true }));
    });

    it("does not update an entry from a different register than the bound conversation", async () => {
      const findWorkspaceByConversationId = vi.fn().mockResolvedValue({
        type: "GENERAL_HELP",
        registerId: "reg-1",
      });
      const customDeps = {
        ...deps,
        workspaceRepo: { findWorkspaceByConversationId },
      };
      getEntryExecute.mockResolvedValue(ok({ entry: baseEntry({ registerId: "reg-2" }) }));

      const tool = buildCashManagementTools(
        customDeps as Parameters<typeof buildCashManagementTools>[0]
      ).find((item) => item.name === "update_cash_entry");
      const result = await tool?.execute?.({
        tenantId: "tenant-1",
        workspaceId: "ws-1",
        userId: "user-1",
        runId: "conv-123",
        input: { entryId: "entry-1", reason: "Correction", description: "Corrected entry" },
      });

      expect(result).toEqual({
        ok: false,
        code: "NOT_FOUND",
        message: "The cash entry does not belong to this conversation's register.",
      });
      expect(reverseEntryExecute).not.toHaveBeenCalled();
    });

    it("does not attach a receipt to an entry from a different register than the bound conversation", async () => {
      const findWorkspaceByConversationId = vi.fn().mockResolvedValue({
        type: "GENERAL_HELP",
        registerId: "reg-1",
      });
      const customDeps = {
        ...deps,
        workspaceRepo: { findWorkspaceByConversationId },
      };
      getEntryExecute.mockResolvedValue(ok({ entry: baseEntry({ registerId: "reg-2" }) }));

      const tool = buildCashManagementTools(
        customDeps as Parameters<typeof buildCashManagementTools>[0]
      ).find((item) => item.name === "attach_receipt_to_entry");
      const result = await tool?.execute?.({
        tenantId: "tenant-1",
        workspaceId: "ws-1",
        userId: "user-1",
        runId: "conv-123",
        input: { entryId: "entry-1", documentId: "doc-1" },
      });

      expect(result).toEqual({
        ok: false,
        code: "NOT_FOUND",
        message: "The cash entry does not belong to this conversation's register.",
      });
      expect(attachBelegExecute).not.toHaveBeenCalled();
    });

    it("asserts that no model-visible cash tool JSON schema exposes registerId property", () => {
      const tools = buildCashManagementTools(deps);
      for (const tool of tools) {
        if (!tool.inputSchema) continue;
        const shape = (tool.inputSchema as any).shape;
        if (shape) {
          expect(shape.registerId).toBeUndefined();
        }
      }
    });
  });
});
