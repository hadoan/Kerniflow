import { apiClient } from "./api-client";
import type {
  SetupAccountingInput,
  SetupAccountingOutput,
  SetupStatusOutput,
  CreateLedgerAccountInput,
  CreateLedgerAccountOutput,
  UpdateLedgerAccountInput,
  UpdateLedgerAccountOutput,
  ListLedgerAccountsInput,
  ListLedgerAccountsOutput,
  CreateJournalEntryInput,
  CreateJournalEntryOutput,
  UpdateJournalEntryInput,
  UpdateJournalEntryOutput,
  PostJournalEntryOutput,
  ReverseJournalEntryInput,
  ReverseJournalEntryOutput,
  ListJournalEntriesInput,
  ListJournalEntriesOutput,
  GetTrialBalanceInput,
  GetTrialBalanceOutput,
  GetGeneralLedgerInput,
  GetGeneralLedgerOutput,
  GetProfitLossInput,
  GetProfitLossOutput,
  GetBalanceSheetInput,
  GetBalanceSheetOutput,
  UpdateAccountingSettingsInput,
  UpdateAccountingSettingsOutput,
  ClosePeriodOutput,
  ReopenPeriodOutput,
  LedgerAccountDto,
  JournalEntryDto,
  AccountingSettingsDto,
  AccountingPeriodDto,
} from "@corely/contracts";

export class AccountingApi {
  // ===== Setup =====
  async getSetupStatus(): Promise<SetupStatusOutput> {
    return await apiClient.get<SetupStatusOutput>("/accounting/setup/status", {
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async setupAccounting(
    input: SetupAccountingInput,
    idempotencyKey?: string
  ): Promise<SetupAccountingOutput> {
    return await apiClient.post<SetupAccountingOutput>("/accounting/setup", input, {
      idempotencyKey: idempotencyKey || apiClient.generateIdempotencyKey(),
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  // ===== Ledger Accounts =====
  async listAccounts(query?: ListLedgerAccountsInput): Promise<ListLedgerAccountsOutput> {
    const params = new URLSearchParams();
    if (query?.type) {
      params.append("type", query.type);
    }
    if (query?.isActive !== undefined) {
      params.append("isActive", query.isActive.toString());
    }
    if (query?.search) {
      params.append("search", query.search);
    }
    if (query?.limit) {
      params.append("limit", query.limit.toString());
    }
    if (query?.cursor) {
      params.append("cursor", query.cursor);
    }

    const queryString = params.toString();
    return await apiClient.get<ListLedgerAccountsOutput>(
      `/accounting/accounts${queryString ? `?${queryString}` : ""}`,
      { correlationId: apiClient.generateCorrelationId() }
    );
  }

  async getAccount(accountId: string): Promise<LedgerAccountDto> {
    const result = await apiClient.get<{ account: LedgerAccountDto }>(
      `/accounting/accounts/${accountId}`,
      { correlationId: apiClient.generateCorrelationId() }
    );
    return result.account;
  }

  async createAccount(
    input: CreateLedgerAccountInput,
    idempotencyKey?: string
  ): Promise<LedgerAccountDto> {
    const result = await apiClient.post<CreateLedgerAccountOutput>("/accounting/accounts", input, {
      idempotencyKey: idempotencyKey || apiClient.generateIdempotencyKey(),
      correlationId: apiClient.generateCorrelationId(),
    });
    return result.account;
  }

  async updateAccount(
    accountId: string,
    patch: Omit<UpdateLedgerAccountInput, "accountId">,
    idempotencyKey?: string
  ): Promise<LedgerAccountDto> {
    const result = await apiClient.patch<UpdateLedgerAccountOutput>(
      `/accounting/accounts/${accountId}`,
      { ...patch, accountId },
      {
        idempotencyKey: idempotencyKey || apiClient.generateIdempotencyKey(),
        correlationId: apiClient.generateCorrelationId(),
      }
    );
    return result.account;
  }

  // ===== Journal Entries =====
  async listJournalEntries(query?: ListJournalEntriesInput): Promise<ListJournalEntriesOutput> {
    const params = new URLSearchParams();
    if (query?.status) {
      params.append("status", query.status);
    }
    if (query?.fromDate) {
      params.append("fromDate", query.fromDate);
    }
    if (query?.toDate) {
      params.append("toDate", query.toDate);
    }
    if (query?.accountId) {
      params.append("accountId", query.accountId);
    }
    if (query?.search) {
      params.append("search", query.search);
    }
    if (query?.limit) {
      params.append("limit", query.limit.toString());
    }
    if (query?.cursor) {
      params.append("cursor", query.cursor);
    }

    const queryString = params.toString();
    return await apiClient.get<ListJournalEntriesOutput>(
      `/accounting/journal-entries${queryString ? `?${queryString}` : ""}`,
      { correlationId: apiClient.generateCorrelationId() }
    );
  }

  async getJournalEntry(entryId: string): Promise<JournalEntryDto> {
    const result = await apiClient.get<{ entry: JournalEntryDto }>(
      `/accounting/journal-entries/${entryId}`,
      { correlationId: apiClient.generateCorrelationId() }
    );
    return result.entry;
  }

  async createJournalEntryDraft(
    input: CreateJournalEntryInput,
    idempotencyKey?: string
  ): Promise<JournalEntryDto> {
    const result = await apiClient.post<CreateJournalEntryOutput>(
      "/accounting/journal-entries",
      input,
      {
        idempotencyKey: idempotencyKey || apiClient.generateIdempotencyKey(),
        correlationId: apiClient.generateCorrelationId(),
      }
    );
    return result.entry;
  }

  async updateJournalEntryDraft(
    entryId: string,
    patch: Omit<UpdateJournalEntryInput, "entryId">,
    idempotencyKey?: string
  ): Promise<JournalEntryDto> {
    const result = await apiClient.patch<UpdateJournalEntryOutput>(
      `/accounting/journal-entries/${entryId}`,
      { ...patch, entryId },
      {
        idempotencyKey: idempotencyKey || apiClient.generateIdempotencyKey(),
        correlationId: apiClient.generateCorrelationId(),
      }
    );
    return result.entry;
  }

  async postJournalEntry(entryId: string, idempotencyKey?: string): Promise<JournalEntryDto> {
    const result = await apiClient.post<PostJournalEntryOutput>(
      `/accounting/journal-entries/${entryId}/post`,
      { entryId },
      {
        idempotencyKey: idempotencyKey || apiClient.generateIdempotencyKey(),
        correlationId: apiClient.generateCorrelationId(),
      }
    );
    return result.entry;
  }

  async reverseJournalEntry(
    entryId: string,
    input: Omit<ReverseJournalEntryInput, "entryId">,
    idempotencyKey?: string
  ): Promise<ReverseJournalEntryOutput> {
    return await apiClient.post<ReverseJournalEntryOutput>(
      `/accounting/journal-entries/${entryId}/reverse`,
      { ...input, entryId },
      {
        idempotencyKey: idempotencyKey || apiClient.generateIdempotencyKey(),
        correlationId: apiClient.generateCorrelationId(),
      }
    );
  }

  // ===== Settings & Periods =====
  async getSettings(): Promise<AccountingSettingsDto> {
    const result = await apiClient.get<{ settings: AccountingSettingsDto }>(
      "/accounting/settings",
      { correlationId: apiClient.generateCorrelationId() }
    );
    return result.settings;
  }

  async updateSettings(
    patch: UpdateAccountingSettingsInput,
    idempotencyKey?: string
  ): Promise<AccountingSettingsDto> {
    const result = await apiClient.patch<UpdateAccountingSettingsOutput>(
      "/accounting/settings",
      patch,
      {
        idempotencyKey: idempotencyKey || apiClient.generateIdempotencyKey(),
        correlationId: apiClient.generateCorrelationId(),
      }
    );
    return result.settings;
  }

  async listPeriods(): Promise<AccountingPeriodDto[]> {
    const result = await apiClient.get<{ periods: AccountingPeriodDto[] }>("/accounting/periods", {
      correlationId: apiClient.generateCorrelationId(),
    });
    return result.periods;
  }

  async closePeriod(
    periodId: string,
    confirmation: boolean,
    idempotencyKey?: string
  ): Promise<AccountingPeriodDto> {
    const result = await apiClient.post<ClosePeriodOutput>(
      `/accounting/periods/${periodId}/close`,
      { periodId, confirmation },
      {
        idempotencyKey: idempotencyKey || apiClient.generateIdempotencyKey(),
        correlationId: apiClient.generateCorrelationId(),
      }
    );
    return result.period;
  }

  async reopenPeriod(
    periodId: string,
    reason: string,
    idempotencyKey?: string
  ): Promise<AccountingPeriodDto> {
    const result = await apiClient.post<ReopenPeriodOutput>(
      `/accounting/periods/${periodId}/reopen`,
      { periodId, confirmation: true, reason },
      {
        idempotencyKey: idempotencyKey || apiClient.generateIdempotencyKey(),
        correlationId: apiClient.generateCorrelationId(),
      }
    );
    return result.period;
  }

  // ===== Reports =====
  async getTrialBalance(params: GetTrialBalanceInput): Promise<GetTrialBalanceOutput> {
    const queryParams = new URLSearchParams();
    queryParams.append("fromDate", params.fromDate);
    queryParams.append("toDate", params.toDate);

    return await apiClient.get<GetTrialBalanceOutput>(
      `/accounting/reports/trial-balance?${queryParams.toString()}`,
      { correlationId: apiClient.generateCorrelationId() }
    );
  }

  async getGeneralLedger(params: GetGeneralLedgerInput): Promise<GetGeneralLedgerOutput> {
    const queryParams = new URLSearchParams();
    queryParams.append("accountId", params.accountId);
    queryParams.append("fromDate", params.fromDate);
    queryParams.append("toDate", params.toDate);

    return await apiClient.get<GetGeneralLedgerOutput>(
      `/accounting/reports/general-ledger?${queryParams.toString()}`,
      { correlationId: apiClient.generateCorrelationId() }
    );
  }

  async getProfitLoss(params: GetProfitLossInput): Promise<GetProfitLossOutput> {
    const queryParams = new URLSearchParams();
    queryParams.append("fromDate", params.fromDate);
    queryParams.append("toDate", params.toDate);

    return await apiClient.get<GetProfitLossOutput>(
      `/accounting/reports/profit-loss?${queryParams.toString()}`,
      { correlationId: apiClient.generateCorrelationId() }
    );
  }

  async getBalanceSheet(params: GetBalanceSheetInput): Promise<GetBalanceSheetOutput> {
    const queryParams = new URLSearchParams();
    queryParams.append("asOfDate", params.asOfDate);

    return await apiClient.get<GetBalanceSheetOutput>(
      `/accounting/reports/balance-sheet?${queryParams.toString()}`,
      { correlationId: apiClient.generateCorrelationId() }
    );
  }
}

export const accountingApi = new AccountingApi();
