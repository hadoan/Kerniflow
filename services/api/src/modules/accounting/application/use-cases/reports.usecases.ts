// Report Use Cases
import { BaseUseCase, type LoggerPort, ValidationError, NotFoundError } from "@corely/kernel";
import type { Result, UseCaseContext, UseCaseError } from "@corely/kernel";
import { ok, err } from "@corely/kernel";
import type {
  GetTrialBalanceInput,
  GetTrialBalanceOutput,
  GetGeneralLedgerInput,
  GetGeneralLedgerOutput,
  GetProfitLossInput,
  GetProfitLossOutput,
  GetBalanceSheetInput,
  GetBalanceSheetOutput,
  AccountType,
} from "@corely/contracts";
import type {
  AccountingSettingsRepoPort,
  LedgerAccountRepoPort,
  JournalEntryRepoPort,
} from "../ports/accounting-repository.port";
import type { AccountingReportQueryPort } from "../ports/accounting-report-query.port";

type BaseDeps = {
  logger: LoggerPort;
  settingsRepo: AccountingSettingsRepoPort;
  accountRepo: LedgerAccountRepoPort;
  entryRepo: JournalEntryRepoPort;
  reportQuery: AccountingReportQueryPort;
};

// ===== Trial Balance =====
export class GetTrialBalanceUseCase extends BaseUseCase<
  GetTrialBalanceInput,
  GetTrialBalanceOutput
> {
  constructor(protected readonly deps: BaseDeps) {
    super({ logger: deps.logger });
  }

  protected async handle(
    input: GetTrialBalanceInput,
    ctx: UseCaseContext
  ): Promise<Result<GetTrialBalanceOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId is required"));
    }

    const settings = await this.deps.settingsRepo.findByTenant(ctx.tenantId);
    if (!settings) {
      return err(new NotFoundError("Accounting not set up"));
    }

    // Get all accounts
    const { accounts } = await this.deps.accountRepo.list(ctx.tenantId, { limit: 1000 });

    // Calculate balances for each account
    const lines = await Promise.all(
      accounts.map(async (account) => {
        const { debits, credits } = await this.calculateAccountActivity(
          ctx.tenantId,
          account.id,
          input.fromDate,
          input.toDate
        );

        const balance = debits - credits;

        return {
          ledgerAccountId: account.id,
          ledgerAccountCode: account.code,
          ledgerAccountName: account.name,
          ledgerAccountType: account.type,
          debitsCents: debits,
          creditsCents: credits,
          balanceCents: balance,
        };
      })
    );

    // Filter out zero balances
    const nonZeroLines = lines.filter((l) => l.debitsCents !== 0 || l.creditsCents !== 0);

    const totalDebits = nonZeroLines.reduce((sum, l) => sum + l.debitsCents, 0);
    const totalCredits = nonZeroLines.reduce((sum, l) => sum + l.creditsCents, 0);

    return ok({
      trialBalance: {
        fromDate: input.fromDate,
        toDate: input.toDate,
        currency: settings.baseCurrency,
        lines: nonZeroLines,
        totalDebitsCents: totalDebits,
        totalCreditsCents: totalCredits,
      },
    });
  }

  private async calculateAccountActivity(
    tenantId: string,
    accountId: string,
    fromDate: string,
    toDate: string
  ): Promise<{ debits: number; credits: number }> {
    const totals = await this.deps.reportQuery.getAccountActivityTotals({
      tenantId,
      accountId,
      fromDate,
      toDate,
    });

    return {
      debits: totals.debitsCents,
      credits: totals.creditsCents,
    };
  }
}

// ===== General Ledger =====
export class GetGeneralLedgerUseCase extends BaseUseCase<
  GetGeneralLedgerInput,
  GetGeneralLedgerOutput
> {
  constructor(protected readonly deps: BaseDeps) {
    super({ logger: deps.logger });
  }

  protected async handle(
    input: GetGeneralLedgerInput,
    ctx: UseCaseContext
  ): Promise<Result<GetGeneralLedgerOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId is required"));
    }

    const settings = await this.deps.settingsRepo.findByTenant(ctx.tenantId);
    if (!settings) {
      return err(new NotFoundError("Accounting not set up"));
    }

    const account = await this.deps.accountRepo.findById(ctx.tenantId, input.accountId);
    if (!account) {
      return err(new NotFoundError("Account not found"));
    }

    // Get lines for this account in date range
    const lines = await this.deps.reportQuery.listLedgerLines({
      tenantId: ctx.tenantId,
      accountId: input.accountId,
      fromDate: input.fromDate,
      toDate: input.toDate,
    });

    // Calculate opening balance (before fromDate)
    const openingTotals = await this.deps.reportQuery.getAccountActivityTotals({
      tenantId: ctx.tenantId,
      accountId: input.accountId,
      toDateExclusive: input.fromDate,
    });

    const openingBalanceCents = openingTotals.debitsCents - openingTotals.creditsCents;

    // Build ledger entries with running balance
    let runningBalance = openingBalanceCents;
    const entries = lines.map((line) => {
      const debitCents = line.direction === "Debit" ? line.amountCents : 0;
      const creditCents = line.direction === "Credit" ? line.amountCents : 0;

      runningBalance += debitCents - creditCents;

      return {
        id: line.id,
        journalEntryId: line.journalEntryId,
        journalEntryNumber: line.journalEntry.entryNumber || null,
        postingDate: line.journalEntry.postingDate.toISOString().split("T")[0],
        memo: line.journalEntry.memo,
        lineMemo: line.lineMemo || null,
        debitCents,
        creditCents,
        balanceCents: runningBalance,
      };
    });

    const totalDebits = lines
      .filter((l) => l.direction === "Debit")
      .reduce((sum, l) => sum + l.amountCents, 0);
    const totalCredits = lines
      .filter((l) => l.direction === "Credit")
      .reduce((sum, l) => sum + l.amountCents, 0);

    return ok({
      generalLedger: {
        ledgerAccountId: account.id,
        ledgerAccountCode: account.code,
        ledgerAccountName: account.name,
        ledgerAccountType: account.type,
        fromDate: input.fromDate,
        toDate: input.toDate,
        currency: settings.baseCurrency,
        openingBalanceCents,
        entries,
        closingBalanceCents: runningBalance,
        totalDebitsCents: totalDebits,
        totalCreditsCents: totalCredits,
      },
    });
  }
}

// ===== Profit & Loss =====
export class GetProfitLossUseCase extends BaseUseCase<GetProfitLossInput, GetProfitLossOutput> {
  constructor(protected readonly deps: BaseDeps) {
    super({ logger: deps.logger });
  }

  protected async handle(
    input: GetProfitLossInput,
    ctx: UseCaseContext
  ): Promise<Result<GetProfitLossOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId is required"));
    }

    const settings = await this.deps.settingsRepo.findByTenant(ctx.tenantId);
    if (!settings) {
      return err(new NotFoundError("Accounting not set up"));
    }

    const { accounts } = await this.deps.accountRepo.list(ctx.tenantId, { limit: 1000 });

    const incomeAccounts = accounts.filter((a) => a.type === "Income");
    const expenseAccounts = accounts.filter((a) => a.type === "Expense");

    const incomeLines = await Promise.all(
      incomeAccounts.map(async (account) => {
        const amount = await this.calculateAccountBalance(
          ctx.tenantId,
          account.id,
          account.type,
          input.fromDate,
          input.toDate
        );

        return {
          ledgerAccountId: account.id,
          ledgerAccountCode: account.code,
          ledgerAccountName: account.name,
          amountCents: amount,
        };
      })
    );

    const expenseLines = await Promise.all(
      expenseAccounts.map(async (account) => {
        const amount = await this.calculateAccountBalance(
          ctx.tenantId,
          account.id,
          account.type,
          input.fromDate,
          input.toDate
        );

        return {
          ledgerAccountId: account.id,
          ledgerAccountCode: account.code,
          ledgerAccountName: account.name,
          amountCents: amount,
        };
      })
    );

    const totalIncome = incomeLines.reduce((sum, l) => sum + l.amountCents, 0);
    const totalExpenses = expenseLines.reduce((sum, l) => sum + l.amountCents, 0);
    const netProfit = totalIncome - totalExpenses;

    return ok({
      profitLoss: {
        fromDate: input.fromDate,
        toDate: input.toDate,
        currency: settings.baseCurrency,
        incomeAccounts: incomeLines.filter((l) => l.amountCents !== 0),
        expenseAccounts: expenseLines.filter((l) => l.amountCents !== 0),
        totalIncomeCents: totalIncome,
        totalExpensesCents: totalExpenses,
        netProfitCents: netProfit,
      },
    });
  }

  private async calculateAccountBalance(
    tenantId: string,
    accountId: string,
    accountType: AccountType,
    fromDate: string,
    toDate: string
  ): Promise<number> {
    const totals = await this.deps.reportQuery.getAccountActivityTotals({
      tenantId,
      accountId,
      fromDate,
      toDate,
    });

    const debitSum = totals.debitsCents;
    const creditSum = totals.creditsCents;

    // For Income accounts, credits increase balance (normal credit balance)
    // For Expense accounts, debits increase balance (normal debit balance)
    if (accountType === "Income") {
      return creditSum - debitSum;
    } else {
      return debitSum - creditSum;
    }
  }
}

// ===== Balance Sheet =====
export class GetBalanceSheetUseCase extends BaseUseCase<
  GetBalanceSheetInput,
  GetBalanceSheetOutput
> {
  constructor(protected readonly deps: BaseDeps) {
    super({ logger: deps.logger });
  }

  protected async handle(
    input: GetBalanceSheetInput,
    ctx: UseCaseContext
  ): Promise<Result<GetBalanceSheetOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId is required"));
    }

    const settings = await this.deps.settingsRepo.findByTenant(ctx.tenantId);
    if (!settings) {
      return err(new NotFoundError("Accounting not set up"));
    }

    const { accounts } = await this.deps.accountRepo.list(ctx.tenantId, { limit: 1000 });

    const assetAccounts = accounts.filter((a) => a.type === "Asset");
    const liabilityAccounts = accounts.filter((a) => a.type === "Liability");
    const equityAccounts = accounts.filter((a) => a.type === "Equity");

    const assetLines = await Promise.all(
      assetAccounts.map(async (account) => {
        const balance = await this.calculateAccountBalanceAsOf(
          ctx.tenantId,
          account.id,
          account.type,
          input.asOfDate
        );

        return {
          ledgerAccountId: account.id,
          ledgerAccountCode: account.code,
          ledgerAccountName: account.name,
          balanceCents: balance,
        };
      })
    );

    const liabilityLines = await Promise.all(
      liabilityAccounts.map(async (account) => {
        const balance = await this.calculateAccountBalanceAsOf(
          ctx.tenantId,
          account.id,
          account.type,
          input.asOfDate
        );

        return {
          ledgerAccountId: account.id,
          ledgerAccountCode: account.code,
          ledgerAccountName: account.name,
          balanceCents: balance,
        };
      })
    );

    const equityLines = await Promise.all(
      equityAccounts.map(async (account) => {
        const balance = await this.calculateAccountBalanceAsOf(
          ctx.tenantId,
          account.id,
          account.type,
          input.asOfDate
        );

        return {
          ledgerAccountId: account.id,
          ledgerAccountCode: account.code,
          ledgerAccountName: account.name,
          balanceCents: balance,
        };
      })
    );

    const totalAssets = assetLines.reduce((sum, l) => sum + l.balanceCents, 0);
    const totalLiabilities = liabilityLines.reduce((sum, l) => sum + l.balanceCents, 0);
    const totalEquity = equityLines.reduce((sum, l) => sum + l.balanceCents, 0);

    return ok({
      balanceSheet: {
        asOfDate: input.asOfDate,
        currency: settings.baseCurrency,
        assetAccounts: assetLines.filter((l) => l.balanceCents !== 0),
        liabilityAccounts: liabilityLines.filter((l) => l.balanceCents !== 0),
        equityAccounts: equityLines.filter((l) => l.balanceCents !== 0),
        totalAssetsCents: totalAssets,
        totalLiabilitiesCents: totalLiabilities,
        totalEquityCents: totalEquity,
      },
    });
  }

  private async calculateAccountBalanceAsOf(
    tenantId: string,
    accountId: string,
    accountType: AccountType,
    asOfDate: string
  ): Promise<number> {
    const totals = await this.deps.reportQuery.getAccountActivityTotals({
      tenantId,
      accountId,
      toDate: asOfDate,
    });

    const debitSum = totals.debitsCents;
    const creditSum = totals.creditsCents;

    // Assets have normal debit balance
    // Liabilities and Equity have normal credit balance
    if (accountType === "Asset") {
      return debitSum - creditSum;
    } else {
      return creditSum - debitSum;
    }
  }
}
