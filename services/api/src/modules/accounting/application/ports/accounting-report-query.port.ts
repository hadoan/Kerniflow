export type LedgerLineRow = {
  id: string;
  journalEntryId: string;
  amountCents: number;
  direction: "Debit" | "Credit";
  lineMemo: string | null;
  journalEntry: {
    entryNumber: string | null;
    postingDate: Date;
    memo: string | null;
  };
};

export type AccountActivityTotals = {
  debitsCents: number;
  creditsCents: number;
};

export type AccountActivityQuery = {
  tenantId: string;
  accountId: string;
  fromDate?: string;
  toDate?: string;
  toDateExclusive?: string;
};

export interface AccountingReportQueryPort {
  getAccountActivityTotals(query: AccountActivityQuery): Promise<AccountActivityTotals>;
  listLedgerLines(query: {
    tenantId: string;
    accountId: string;
    fromDate: string;
    toDate: string;
  }): Promise<LedgerLineRow[]>;
}

export const ACCOUNTING_REPORT_QUERY_PORT = Symbol("ACCOUNTING_REPORT_QUERY_PORT");
