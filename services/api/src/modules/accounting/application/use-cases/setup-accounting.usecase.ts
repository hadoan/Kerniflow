import {
  BaseUseCase,
  type ClockPort,
  type IdGeneratorPort,
  type LoggerPort,
} from "@kerniflow/kernel";
import type { SetupAccountingInput, SetupAccountingOutput } from "@kerniflow/contracts";
import type { Result, UseCaseContext, UseCaseError } from "@kerniflow/kernel";
import { ok, err } from "@kerniflow/kernel";
import type {
  AccountingSettingsRepoPort,
  LedgerAccountRepoPort,
  AccountingPeriodRepoPort,
} from "../ports/accounting-repository.port";
import { AccountingSettingsAggregate } from "../../domain/accounting-settings.aggregate";
import { LedgerAccountAggregate } from "../../domain/ledger-account.aggregate";
import { AccountingPeriodAggregate } from "../../domain/accounting-period.aggregate";
import { getCoaTemplate } from "../../domain/coa-templates";

type Deps = {
  logger: LoggerPort;
  settingsRepo: AccountingSettingsRepoPort;
  accountRepo: LedgerAccountRepoPort;
  periodRepo: AccountingPeriodRepoPort;
  idGenerator: IdGeneratorPort;
  clock: ClockPort;
};

export class SetupAccountingUseCase extends BaseUseCase<
  SetupAccountingInput,
  SetupAccountingOutput
> {
  constructor(private readonly deps: Deps) {
    super({ logger: deps.logger });
  }

  protected async handle(
    input: SetupAccountingInput,
    ctx: UseCaseContext
  ): Promise<Result<SetupAccountingOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      return err({ type: "ValidationError", message: "tenantId is required" });
    }

    // Check if already setup
    const existing = await this.deps.settingsRepo.findByTenant(ctx.tenantId);
    if (existing) {
      // Idempotent: return existing setup
      const accounts = await this.deps.accountRepo.list(ctx.tenantId, { limit: 1000 });
      const periods = await this.deps.periodRepo.list(ctx.tenantId);

      return ok({
        settings: this.mapSettingsToDto(existing),
        periods: periods.map(this.mapPeriodToDto),
        accounts: accounts.accounts.map(this.mapAccountToDto),
      });
    }

    const now = this.deps.clock.now();

    // Create settings
    const settings = AccountingSettingsAggregate.create({
      id: this.deps.idGenerator.newId(),
      tenantId: ctx.tenantId,
      baseCurrency: input.baseCurrency,
      fiscalYearStartMonthDay: input.fiscalYearStartMonthDay,
      periodLockingEnabled: input.periodLockingEnabled,
      entryNumberPrefix: input.entryNumberPrefix,
      now,
    });

    // Create chart of accounts from template
    const template = getCoaTemplate(input.template || "standard");
    const accounts = template.map((tpl) =>
      LedgerAccountAggregate.create({
        id: this.deps.idGenerator.newId(),
        tenantId: ctx.tenantId,
        code: tpl.code,
        name: tpl.name,
        type: tpl.type,
        description: tpl.description,
        systemAccountKey: tpl.systemAccountKey,
        isActive: true,
        now,
      })
    );

    // Generate periods for current fiscal year
    const periods = this.generatePeriodsForCurrentYear(
      ctx.tenantId,
      input.fiscalYearStartMonthDay,
      now
    );

    // Save all
    await this.deps.settingsRepo.save(settings);
    await this.deps.accountRepo.saveMany(accounts);
    await this.deps.periodRepo.saveMany(periods);

    return ok({
      settings: this.mapSettingsToDto(settings),
      periods: periods.map(this.mapPeriodToDto),
      accounts: accounts.map(this.mapAccountToDto),
    });
  }

  private generatePeriodsForCurrentYear(
    tenantId: string,
    fiscalYearStartMonthDay: string,
    now: Date
  ): AccountingPeriodAggregate[] {
    const [startMonth, startDay] = fiscalYearStartMonthDay.split("-").map(Number);
    const currentYear = now.getFullYear();

    // Determine fiscal year start
    let fiscalYearStart = new Date(currentYear, startMonth - 1, startDay);
    if (fiscalYearStart > now) {
      fiscalYearStart = new Date(currentYear - 1, startMonth - 1, startDay);
    }

    const fiscalYearId = `FY${fiscalYearStart.getFullYear()}`;

    // Generate 12 monthly periods
    const periods: AccountingPeriodAggregate[] = [];
    for (let i = 0; i < 12; i++) {
      const periodStart = new Date(fiscalYearStart);
      periodStart.setMonth(periodStart.getMonth() + i);

      const periodEnd = new Date(periodStart);
      periodEnd.setMonth(periodEnd.getMonth() + 1);
      periodEnd.setDate(periodEnd.getDate() - 1);

      const monthName = periodStart.toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      });

      periods.push(
        AccountingPeriodAggregate.create({
          id: this.deps.idGenerator.newId(),
          tenantId,
          fiscalYearId,
          name: monthName,
          startDate: periodStart.toISOString().split("T")[0],
          endDate: periodEnd.toISOString().split("T")[0],
          now,
        })
      );
    }

    return periods;
  }

  private mapSettingsToDto(settings: AccountingSettingsAggregate) {
    return {
      id: settings.id,
      tenantId: settings.tenantId,
      baseCurrency: settings.baseCurrency,
      fiscalYearStartMonthDay: settings.fiscalYearStartMonthDay,
      periodLockingEnabled: settings.periodLockingEnabled,
      entryNumberPrefix: settings.entryNumberPrefix,
      nextEntryNumber: settings.nextEntryNumber,
      createdAt: settings.toProps().createdAt.toISOString(),
      updatedAt: settings.toProps().updatedAt.toISOString(),
    };
  }

  private mapPeriodToDto(period: AccountingPeriodAggregate) {
    const props = period.toProps();
    return {
      id: period.id,
      tenantId: period.tenantId,
      fiscalYearId: period.fiscalYearId,
      name: period.name,
      startDate: period.startDate,
      endDate: period.endDate,
      status: period.status,
      closedAt: props.closedAt?.toISOString() || null,
      closedBy: period.closedBy || null,
      createdAt: props.createdAt.toISOString(),
      updatedAt: props.updatedAt.toISOString(),
    };
  }

  private mapAccountToDto(account: LedgerAccountAggregate) {
    const props = account.toProps();
    return {
      id: account.id,
      tenantId: account.tenantId,
      code: account.code,
      name: account.name,
      type: account.type,
      isActive: account.isActive,
      description: account.description || null,
      systemAccountKey: account.systemAccountKey || null,
      createdAt: props.createdAt.toISOString(),
      updatedAt: props.updatedAt.toISOString(),
    };
  }
}
