import { describe, expect, it } from "vitest";
import { CashEntryDirection, CashEntryType } from "@corely/contracts";
import type { CashEntryEntity } from "./entities";
import { toCashReportingMovements } from "./cash-entry-reporting";

const makeEntry = (overrides: Partial<CashEntryEntity>): CashEntryEntity => ({
  id: "entry-1",
  tenantId: "tenant-1",
  workspaceId: "workspace-1",
  registerId: "register-1",
  entryNo: 1,
  occurredAt: new Date("2026-07-31T12:00:00.000Z"),
  dayKey: "2026-07-31",
  description: "Cash sale",
  type: CashEntryType.SALE_CASH,
  direction: CashEntryDirection.IN,
  source: "MANUAL",
  paymentMethod: "CASH",
  amountCents: 12000,
  grossAmountCents: 12000,
  netAmountCents: 10084,
  taxAmountCents: 1916,
  taxMode: "OUTPUT_VAT",
  taxCodeId: "tax-code-1",
  taxCode: "DE_STD_19",
  taxRateBps: 1900,
  taxLabel: "USt 19%",
  currency: "EUR",
  balanceAfterCents: 12000,
  sourceDocumentId: null,
  sourceDocumentRef: null,
  sourceDocumentKind: null,
  referenceId: null,
  reversalOfEntryId: null,
  reversedByEntryId: null,
  lockedByDayCloseId: null,
  createdAt: new Date("2026-07-31T12:00:00.000Z"),
  createdByUserId: "user-1",
  ...overrides,
});

describe("toCashReportingMovements", () => {
  it("negates the original category for a same-day accounting reversal", () => {
    const original = makeEntry({ id: "sale-1" });
    const reversal = makeEntry({
      id: "reversal-1",
      entryNo: 2,
      type: CashEntryType.CORRECTION,
      direction: CashEntryDirection.OUT,
      reversalOfEntryId: original.id,
    });

    expect(toCashReportingMovements([original, reversal])).toEqual([
      { type: CashEntryType.SALE_CASH, direction: CashEntryDirection.IN, amountCents: 12000 },
      { type: CashEntryType.SALE_CASH, direction: CashEntryDirection.IN, amountCents: -12000 },
    ]);
  });

  it("keeps a later-day reversal as a physical correction movement", () => {
    const reversal = makeEntry({
      id: "reversal-1",
      dayKey: "2026-08-02",
      type: CashEntryType.CORRECTION,
      direction: CashEntryDirection.OUT,
      reversalOfEntryId: "sale-from-july",
    });

    expect(toCashReportingMovements([reversal])).toEqual([
      { type: CashEntryType.CORRECTION, direction: CashEntryDirection.OUT, amountCents: 12000 },
    ]);
  });
});
