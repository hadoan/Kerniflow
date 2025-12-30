// Consolidated Accounting Use Cases
import {
  BaseUseCase,
  type ClockPort,
  type IdGeneratorPort,
  type LoggerPort,
  ValidationError,
  NotFoundError,
  ConflictError,
} from "@corely/kernel";
import type { Result, UseCaseContext, UseCaseError } from "@corely/kernel";
import { ok, err } from "@corely/kernel";
import type {
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
  PostJournalEntryInput,
  PostJournalEntryOutput,
  ReverseJournalEntryInput,
  ReverseJournalEntryOutput,
  ListJournalEntriesInput,
  ListJournalEntriesOutput,
  ClosePeriodInput,
  ClosePeriodOutput,
  ReopenPeriodInput,
  ReopenPeriodOutput,
  UpdateAccountingSettingsInput,
  UpdateAccountingSettingsOutput,
  SetupStatusOutput,
} from "@corely/contracts";
import type {
  AccountingSettingsRepoPort,
  LedgerAccountRepoPort,
  JournalEntryRepoPort,
  AccountingPeriodRepoPort,
} from "../ports/accounting-repository.port";
import { LedgerAccountAggregate } from "../../domain/ledger-account.aggregate";
import { JournalEntryAggregate } from "../../domain/journal-entry.aggregate";

type BaseDeps = {
  logger: LoggerPort;
  settingsRepo: AccountingSettingsRepoPort;
  accountRepo: LedgerAccountRepoPort;
  entryRepo: JournalEntryRepoPort;
  periodRepo: AccountingPeriodRepoPort;
  idGenerator: IdGeneratorPort;
  clock: ClockPort;
};

// ===== Setup Status =====
export class GetSetupStatusUseCase extends BaseUseCase<void, SetupStatusOutput> {
  constructor(protected readonly deps: BaseDeps) {
    super({ logger: deps.logger });
  }

  protected async handle(
    _input: void,
    ctx: UseCaseContext
  ): Promise<Result<SetupStatusOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId is required"));
    }

    const settings = await this.deps.settingsRepo.findByTenant(ctx.tenantId);

    return ok({
      isSetup: !!settings,
      settings: settings ? mapSettingsToDto(settings) : null,
    });
  }
}

// ===== Ledger Account Use Cases =====
export class CreateLedgerAccountUseCase extends BaseUseCase<
  CreateLedgerAccountInput,
  CreateLedgerAccountOutput
> {
  constructor(protected readonly deps: BaseDeps) {
    super({ logger: deps.logger });
  }

  protected async handle(
    input: CreateLedgerAccountInput,
    ctx: UseCaseContext
  ): Promise<Result<CreateLedgerAccountOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId is required"));
    }

    // Check for duplicate code
    const existing = await this.deps.accountRepo.findByCode(ctx.tenantId, input.code);
    if (existing) {
      return err(new ConflictError("Account code already exists"));
    }

    const now = this.deps.clock.now();
    const account = LedgerAccountAggregate.create({
      id: this.deps.idGenerator.newId(),
      tenantId: ctx.tenantId,
      code: input.code,
      name: input.name,
      type: input.type,
      description: input.description,
      systemAccountKey: input.systemAccountKey,
      isActive: input.isActive,
      now,
    });

    await this.deps.accountRepo.save(account);

    return ok({ account: mapAccountToDto(account) });
  }
}

export class UpdateLedgerAccountUseCase extends BaseUseCase<
  UpdateLedgerAccountInput,
  UpdateLedgerAccountOutput
> {
  constructor(protected readonly deps: BaseDeps) {
    super({ logger: deps.logger });
  }

  protected async handle(
    input: UpdateLedgerAccountInput,
    ctx: UseCaseContext
  ): Promise<Result<UpdateLedgerAccountOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId is required"));
    }

    const account = await this.deps.accountRepo.findById(ctx.tenantId, input.accountId);
    if (!account) {
      return err(new NotFoundError("Account not found"));
    }

    const now = this.deps.clock.now();

    if (input.name || input.description !== undefined) {
      account.update({ name: input.name, description: input.description, now });
    }

    if (input.isActive !== undefined) {
      if (input.isActive) {
        account.activate(now);
      } else {
        account.deactivate(now);
      }
    }

    await this.deps.accountRepo.save(account);

    return ok({ account: mapAccountToDto(account) });
  }
}

export class ListLedgerAccountsUseCase extends BaseUseCase<
  ListLedgerAccountsInput,
  ListLedgerAccountsOutput
> {
  constructor(protected readonly deps: BaseDeps) {
    super({ logger: deps.logger });
  }

  protected async handle(
    input: ListLedgerAccountsInput,
    ctx: UseCaseContext
  ): Promise<Result<ListLedgerAccountsOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId is required"));
    }

    const result = await this.deps.accountRepo.list(ctx.tenantId, input);

    return ok({
      accounts: result.accounts.map(mapAccountToDto),
      nextCursor: result.nextCursor,
      total: result.total,
    });
  }
}

// ===== Journal Entry Use Cases =====
export class CreateJournalEntryUseCase extends BaseUseCase<
  CreateJournalEntryInput,
  CreateJournalEntryOutput
> {
  constructor(protected readonly deps: BaseDeps) {
    super({ logger: deps.logger });
  }

  protected async handle(
    input: CreateJournalEntryInput,
    ctx: UseCaseContext
  ): Promise<Result<CreateJournalEntryOutput, UseCaseError>> {
    if (!ctx.tenantId || !ctx.userId) {
      return err(new ValidationError("tenantId and userId are required"));
    }

    // Validate accounts exist and are active
    for (const line of input.lines) {
      const account = await this.deps.accountRepo.findById(ctx.tenantId, line.ledgerAccountId);
      if (!account) {
        return err(new ValidationError(`Account ${line.ledgerAccountId} not found`));
      }
      if (!account.isActive) {
        return err(new ValidationError(`Account ${account.code} ${account.name} is inactive`));
      }
    }

    const now = this.deps.clock.now();
    const lines = input.lines.map((l, idx) => ({
      id: `${this.deps.idGenerator.newId()}-line-${idx}`,
      ledgerAccountId: l.ledgerAccountId,
      direction: l.direction,
      amountCents: l.amountCents,
      currency: l.currency,
      lineMemo: l.lineMemo,
      reference: l.reference,
      tags: l.tags,
    }));

    const entry = JournalEntryAggregate.createDraft({
      id: this.deps.idGenerator.newId(),
      tenantId: ctx.tenantId,
      postingDate: input.postingDate,
      memo: input.memo,
      lines,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      sourceRef: input.sourceRef,
      createdBy: ctx.userId,
      now,
    });

    await this.deps.entryRepo.save(entry);

    return ok({ entry: await mapEntryToDto(entry, this.deps.accountRepo, ctx.tenantId) });
  }
}

export class UpdateJournalEntryUseCase extends BaseUseCase<
  UpdateJournalEntryInput,
  UpdateJournalEntryOutput
> {
  constructor(protected readonly deps: BaseDeps) {
    super({ logger: deps.logger });
  }

  protected async handle(
    input: UpdateJournalEntryInput,
    ctx: UseCaseContext
  ): Promise<Result<UpdateJournalEntryOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId is required"));
    }

    const entry = await this.deps.entryRepo.findById(ctx.tenantId, input.entryId);
    if (!entry) {
      return err(new NotFoundError("Journal entry not found"));
    }

    if (entry.status !== "Draft") {
      return err(new ValidationError("Only draft entries can be updated"));
    }

    const now = this.deps.clock.now();
    const lines = input.lines
      ? input.lines.map((l, idx) => ({
          id: `${input.entryId}-line-${idx}`,
          ledgerAccountId: l.ledgerAccountId,
          direction: l.direction,
          amountCents: l.amountCents,
          currency: l.currency,
          lineMemo: l.lineMemo,
          reference: l.reference,
          tags: l.tags,
        }))
      : undefined;

    entry.updateDraft({
      postingDate: input.postingDate,
      memo: input.memo,
      lines,
      now,
    });

    await this.deps.entryRepo.save(entry);

    return ok({ entry: await mapEntryToDto(entry, this.deps.accountRepo, ctx.tenantId) });
  }
}

export class PostJournalEntryUseCase extends BaseUseCase<
  PostJournalEntryInput,
  PostJournalEntryOutput
> {
  constructor(protected readonly deps: BaseDeps) {
    super({ logger: deps.logger });
  }

  protected async handle(
    input: PostJournalEntryInput,
    ctx: UseCaseContext
  ): Promise<Result<PostJournalEntryOutput, UseCaseError>> {
    if (!ctx.tenantId || !ctx.userId) {
      return err(new ValidationError("tenantId and userId are required"));
    }

    const entry = await this.deps.entryRepo.findById(ctx.tenantId, input.entryId);
    if (!entry) {
      return err(new NotFoundError("Journal entry not found"));
    }

    // Check period locking
    const settings = await this.deps.settingsRepo.findByTenant(ctx.tenantId);
    if (settings?.periodLockingEnabled) {
      const period = await this.deps.periodRepo.findPeriodContainingDate(
        ctx.tenantId,
        entry.postingDate
      );
      if (!period) {
        return err(new ValidationError("No period found for posting date"));
      }
      if (period.status === "Closed") {
        return err(
          new ValidationError(
            `Posting date ${entry.postingDate} is in closed period ${period.name}`
          )
        );
      }
    }

    // Allocate entry number
    if (!settings) {
      return err(new ValidationError("Accounting not set up"));
    }
    const entryNumber = settings.allocateEntryNumber();
    await this.deps.settingsRepo.save(settings);

    const now = this.deps.clock.now();

    try {
      entry.post({ entryNumber, postedBy: ctx.userId, now });
    } catch (error) {
      return err(new ValidationError((error as Error).message));
    }

    await this.deps.entryRepo.save(entry);

    return ok({ entry: await mapEntryToDto(entry, this.deps.accountRepo, ctx.tenantId) });
  }
}

export class ReverseJournalEntryUseCase extends BaseUseCase<
  ReverseJournalEntryInput,
  ReverseJournalEntryOutput
> {
  constructor(protected readonly deps: BaseDeps) {
    super({ logger: deps.logger });
  }

  protected async handle(
    input: ReverseJournalEntryInput,
    ctx: UseCaseContext
  ): Promise<Result<ReverseJournalEntryOutput, UseCaseError>> {
    if (!ctx.tenantId || !ctx.userId) {
      return err(new ValidationError("tenantId and userId are required"));
    }

    const originalEntry = await this.deps.entryRepo.findById(ctx.tenantId, input.entryId);
    if (!originalEntry) {
      return err(new NotFoundError("Journal entry not found"));
    }

    if (originalEntry.status !== "Posted") {
      return err(new ValidationError("Only posted entries can be reversed"));
    }

    if (originalEntry.reversedByEntryId) {
      return err(new ValidationError("Entry has already been reversed"));
    }

    // Check period locking for reversal date
    const settings = await this.deps.settingsRepo.findByTenant(ctx.tenantId);
    if (settings?.periodLockingEnabled) {
      const period = await this.deps.periodRepo.findPeriodContainingDate(
        ctx.tenantId,
        input.reversalDate
      );
      if (!period) {
        return err(new ValidationError("No period found for reversal date"));
      }
      if (period.status === "Closed") {
        return err(
          new ValidationError(
            `Reversal date ${input.reversalDate} is in closed period ${period.name}`
          )
        );
      }
    }

    const now = this.deps.clock.now();

    // Create reversal entry
    const reversalEntry = JournalEntryAggregate.createReversal({
      id: this.deps.idGenerator.newId(),
      tenantId: ctx.tenantId,
      originalEntry,
      reversalDate: input.reversalDate,
      reversalMemo: input.reversalMemo,
      createdBy: ctx.userId,
      now,
    });

    // Auto-post the reversal
    if (!settings) {
      return err(new ValidationError("Accounting not set up"));
    }
    const entryNumber = settings.allocateEntryNumber();
    await this.deps.settingsRepo.save(settings);

    reversalEntry.post({ entryNumber, postedBy: ctx.userId, now });

    // Mark original as reversed
    originalEntry.markAsReversed(reversalEntry.id, now);

    // Save both
    await this.deps.entryRepo.save(reversalEntry);
    await this.deps.entryRepo.save(originalEntry);

    return ok({
      originalEntry: await mapEntryToDto(originalEntry, this.deps.accountRepo, ctx.tenantId),
      reversalEntry: await mapEntryToDto(reversalEntry, this.deps.accountRepo, ctx.tenantId),
    });
  }
}

export class ListJournalEntriesUseCase extends BaseUseCase<
  ListJournalEntriesInput,
  ListJournalEntriesOutput
> {
  constructor(protected readonly deps: BaseDeps) {
    super({ logger: deps.logger });
  }

  protected async handle(
    input: ListJournalEntriesInput,
    ctx: UseCaseContext
  ): Promise<Result<ListJournalEntriesOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId is required"));
    }

    const result = await this.deps.entryRepo.list(ctx.tenantId, input);

    const entries = await Promise.all(
      result.entries.map((e) => mapEntryToDto(e, this.deps.accountRepo, ctx.tenantId))
    );

    return ok({
      entries,
      nextCursor: result.nextCursor,
      total: result.total,
    });
  }
}

// ===== Period Management =====
export class ClosePeriodUseCase extends BaseUseCase<ClosePeriodInput, ClosePeriodOutput> {
  constructor(protected readonly deps: BaseDeps) {
    super({ logger: deps.logger });
  }

  protected async handle(
    input: ClosePeriodInput,
    ctx: UseCaseContext
  ): Promise<Result<ClosePeriodOutput, UseCaseError>> {
    if (!ctx.tenantId || !ctx.userId) {
      return err(new ValidationError("tenantId and userId are required"));
    }

    const period = await this.deps.periodRepo.findById(ctx.tenantId, input.periodId);
    if (!period) {
      return err(new NotFoundError("Period not found"));
    }

    const now = this.deps.clock.now();

    try {
      period.close(ctx.userId, now);
    } catch (error) {
      return err(new ValidationError((error as Error).message));
    }

    await this.deps.periodRepo.save(period);

    return ok({ period: mapPeriodToDto(period) });
  }
}

export class ReopenPeriodUseCase extends BaseUseCase<ReopenPeriodInput, ReopenPeriodOutput> {
  constructor(protected readonly deps: BaseDeps) {
    super({ logger: deps.logger });
  }

  protected async handle(
    input: ReopenPeriodInput,
    ctx: UseCaseContext
  ): Promise<Result<ReopenPeriodOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId is required"));
    }

    const period = await this.deps.periodRepo.findById(ctx.tenantId, input.periodId);
    if (!period) {
      return err(new NotFoundError("Period not found"));
    }

    const now = this.deps.clock.now();

    try {
      period.reopen(now);
    } catch (error) {
      return err(new ValidationError((error as Error).message));
    }

    await this.deps.periodRepo.save(period);

    return ok({ period: mapPeriodToDto(period) });
  }
}

// ===== Settings =====
export class UpdateAccountingSettingsUseCase extends BaseUseCase<
  UpdateAccountingSettingsInput,
  UpdateAccountingSettingsOutput
> {
  constructor(protected readonly deps: BaseDeps) {
    super({ logger: deps.logger });
  }

  protected async handle(
    input: UpdateAccountingSettingsInput,
    ctx: UseCaseContext
  ): Promise<Result<UpdateAccountingSettingsOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId is required"));
    }

    const settings = await this.deps.settingsRepo.findByTenant(ctx.tenantId);
    if (!settings) {
      return err(new NotFoundError("Accounting settings not found"));
    }

    const now = this.deps.clock.now();
    settings.updateSettings({
      periodLockingEnabled: input.periodLockingEnabled,
      entryNumberPrefix: input.entryNumberPrefix,
      now,
    });

    await this.deps.settingsRepo.save(settings);

    return ok({ settings: mapSettingsToDto(settings) });
  }
}

// ===== Helper Mappers =====
function mapSettingsToDto(settings: any) {
  const props = settings.toProps();
  return {
    id: settings.id,
    tenantId: settings.tenantId,
    baseCurrency: settings.baseCurrency,
    fiscalYearStartMonthDay: settings.fiscalYearStartMonthDay,
    periodLockingEnabled: settings.periodLockingEnabled,
    entryNumberPrefix: settings.entryNumberPrefix,
    nextEntryNumber: settings.nextEntryNumber,
    createdAt: props.createdAt.toISOString(),
    updatedAt: props.updatedAt.toISOString(),
  };
}

function mapPeriodToDto(period: any) {
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

function mapAccountToDto(account: LedgerAccountAggregate) {
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

async function mapEntryToDto(
  entry: JournalEntryAggregate,
  accountRepo: LedgerAccountRepoPort,
  tenantId: string
) {
  const props = entry.toProps();

  // Enrich lines with account details
  const lines = await Promise.all(
    props.lines.map(async (line) => {
      const account = await accountRepo.findById(tenantId, line.ledgerAccountId);
      return {
        id: line.id,
        ledgerAccountId: line.ledgerAccountId,
        ledgerAccountCode: account?.code,
        ledgerAccountName: account?.name,
        direction: line.direction,
        amountCents: line.amountCents,
        currency: line.currency,
        lineMemo: line.lineMemo || null,
        reference: line.reference || null,
        tags: line.tags || null,
      };
    })
  );

  return {
    id: entry.id,
    tenantId: entry.tenantId,
    entryNumber: entry.entryNumber || null,
    status: entry.status,
    postingDate: entry.postingDate,
    memo: entry.memo,
    sourceType: entry.sourceType || null,
    sourceId: entry.sourceId || null,
    sourceRef: props.sourceRef || null,
    lines,
    reversesEntryId: entry.reversesEntryId || null,
    reversedByEntryId: entry.reversedByEntryId || null,
    createdBy: entry.createdBy,
    createdAt: props.createdAt.toISOString(),
    postedBy: entry.postedBy || null,
    postedAt: props.postedAt?.toISOString() || null,
    updatedAt: props.updatedAt.toISOString(),
  };
}
