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

  describe("view_kassenbericht", () => {
    it("returns explicit day when provided", async () => {
      getRegisterExecute.mockResolvedValue(ok({ register }));
      const tools = buildCashManagementTools(deps);
      const tool = tools.find((t) => t.name === "view_kassenbericht")!;
      const result = await tool.execute({
        tenantId: "tenant-1",
        workspaceId: "ws-1",
        userId: "user-1",
        toolCallId: "call-1",
        runId: "run-1",
        workspaceCtx: {
          type: "GENERAL_HELP",
          registerId: "reg-1",
          locationId: null,
          businessDate: null,
          businessMonth: null,
        },
        input: { day: "2026-07-23" },
      });
      expect(result).toMatchObject({
        ok: true,
        result: {
          type: "cash.view-kassenbericht",
          version: 1,
          registerId: "reg-1",
          day: "2026-07-23",
        },
      });
    });

    it("uses businessDate from DAILY_CASH_DAY workspace if no explicit day provided", async () => {
      getRegisterExecute.mockResolvedValue(ok({ register }));
      findWorkspaceByConversationId.mockResolvedValue({
        type: "DAILY_CASH_DAY",
        registerId: "reg-1",
        locationId: null,
        businessDate: new Date("2026-08-15T00:00:00Z"),
        businessMonth: null,
      });
      const tools = buildCashManagementTools(deps);
      const tool = tools.find((t) => t.name === "view_kassenbericht")!;
      const result = await tool.execute({
        tenantId: "tenant-1",
        workspaceId: "ws-1",
        userId: "user-1",
        toolCallId: "call-1",
        runId: "run-1",
        input: {},
      });
      expect(result).toMatchObject({
        ok: true,
        result: {
          type: "cash.view-kassenbericht",
          version: 1,
          registerId: "reg-1",
          day: "2026-08-15",
        },
      });
    });

    it("returns error when no register context is found", async () => {
      vi.mocked(deps.getRegister.execute).mockResolvedValue(err(new NotFoundError("Not found")));
      listRegistersExecute.mockResolvedValue(ok({ registers: [] }));
      const tools = buildCashManagementTools(deps);
      const tool = tools.find((t) => t.name === "view_kassenbericht")!;
      const result = await tool.execute({
        tenantId: "tenant-1",
        workspaceId: "ws-1",
        userId: "user-1",
        toolCallId: "call-1",
        runId: "run-1",
        workspaceCtx: {
          type: "GENERAL_HELP",
          registerId: null,
          locationId: null,
          businessDate: null,
          businessMonth: null,
        },
        input: { day: "2026-07-23" },
      });
      expect(result).toMatchObject({
        ok: false,
        error: {
          code: "CashManagement:RegisterContextRequired",
        },
      });
    });
  });
});
