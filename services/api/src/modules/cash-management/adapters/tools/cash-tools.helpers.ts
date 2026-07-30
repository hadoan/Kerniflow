import { type CashRegister, type CashEntry, type CashDayClose } from "@corely/contracts";
import { CashEntryDirection, CashEntrySource, CashDayCloseStatus } from "@corely/contracts";
import { isErr } from "@corely/kernel";
import {
  type CashToolDeps,
  type ToolCtx,
  type ToolFailure,
  type CashAssistantExecutionContext,
  type CashStatusCode,
  getCtx,
  unwrapResult,
  isToolFailure,
  failure,
  toMonthKey,
  monthRange,
  signedAmount,
  requiresReceipt,
  suspiciousEntryTypes,
  isSubmittedDayClose,
  cashToolsLogger,
} from "./cash-tools.shared";

export const resolveRegister = async (
  deps: CashToolDeps,
  params: ToolCtx,
  inputRegisterId?: string
): Promise<CashRegister | ToolFailure> => {
  const ctx = getCtx(params);

  try {
    // 1. Persisted conversation register
    if (params.workspaceCtx?.registerId) {
      const boundId = params.workspaceCtx.registerId;
      if (inputRegisterId && inputRegisterId !== boundId) {
        return failure("CONFLICT", "Cannot override the register bound to this conversation.");
      }
      const result = unwrapResult(await deps.getRegister.execute({ registerId: boundId }, ctx));
      if (isToolFailure(result)) {
        return failure(
          "NOT_FOUND",
          "The bound cash register for this conversation could not be found."
        );
      }
      return result.register;
    }

    if (inputRegisterId) {
      const result = unwrapResult(
        await deps.getRegister.execute({ registerId: inputRegisterId }, ctx)
      );
      if (!isToolFailure(result)) {
        return result.register;
      }
    }

    // 2. Sole-register fallback for legacy/unbound conversations
    const result = unwrapResult(await deps.listRegisters.execute({}, ctx));
    if (isToolFailure(result)) {
      return result;
    }

    if (result.registers.length === 0) {
      return failure("NOT_FOUND", "No cash registers found in the current workspace");
    }

    // 3. REGISTER_SELECTION_REQUIRED when multiple registers exist
    if (result.registers.length > 1) {
      return failure("REGISTER_SELECTION_REQUIRED", "Select a cash register before continuing.", {
        availableRegisters: result.registers.map((register) => ({
          id: register.id,
          name: register.name,
          location: register.location,
        })),
      });
    }

    return result.registers[0];
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    cashToolsLogger.error(
      `[resolveRegister] Unhandled exception (tenantId=${params.tenantId}): ${message}`,
      stack
    );
    return failure("INTERNAL_ERROR", `Failed to resolve cash register: ${message}`);
  }
};

export const assertEntryMatchesBoundRegister = (
  entry: CashEntry,
  workspaceCtx: CashAssistantExecutionContext | null
): ToolFailure | null => {
  if (workspaceCtx?.registerId && entry.registerId !== workspaceCtx.registerId) {
    return failure("NOT_FOUND", "The cash entry does not belong to this conversation's register.");
  }
  return null;
};

export const getDayCloseOrNull = async (
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

export const listEntriesForRange = async (
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

export const listAttachmentsByEntry = async (
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

export const buildTodayStatus = async (
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

export const buildMonthExportStatus = async (
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
