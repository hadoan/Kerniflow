import type { CashEntryDirection, CashEntryType } from "@corely/contracts";
import type { CashEntryEntity } from "./entities";

export type CashReportingMovement = {
  type: CashEntryType;
  direction: CashEntryDirection;
  amountCents: number;
};

/**
 * A closed-day accounting reversal is posted on the original business day.
 * For reporting it must negate the original category (sale, expense, deposit,
 * and so on), not appear as an unrelated cash correction. Reversals recorded
 * on a later day remain physical cash movements of that later day.
 */
export const toCashReportingMovements = (entries: CashEntryEntity[]): CashReportingMovement[] => {
  const entriesById = new Map(entries.map((entry) => [entry.id, entry]));

  return entries.map((entry) => {
    const original = entry.reversalOfEntryId ? entriesById.get(entry.reversalOfEntryId) : undefined;
    const isSameDayAccountingReversal = original?.dayKey === entry.dayKey;

    if (original && isSameDayAccountingReversal) {
      return {
        type: original.type,
        direction: original.direction,
        amountCents: -entry.amountCents,
      };
    }

    return {
      type: entry.type,
      direction: entry.direction,
      amountCents: entry.amountCents,
    };
  });
};
