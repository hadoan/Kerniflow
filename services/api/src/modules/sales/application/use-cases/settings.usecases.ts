import {
  BaseUseCase,
  type ClockPort,
  type IdGeneratorPort,
  type LoggerPort,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ValidationError,
  type AuditPort,
  err,
  ok,
} from "@kerniflow/kernel";
import type {
  GetSalesSettingsInput,
  GetSalesSettingsOutput,
  UpdateSalesSettingsInput,
  UpdateSalesSettingsOutput,
} from "@kerniflow/contracts";
import type { SalesSettingsRepositoryPort } from "../ports/settings-repository.port";
import { SalesSettingsAggregate } from "../../domain/settings.aggregate";
import { toSettingsDto } from "../mappers/sales-dto.mapper";
import type { IdempotencyStoragePort } from "../../../shared/ports/idempotency-storage.port";
import { getIdempotentResult, storeIdempotentResult } from "./idempotency";

type SettingsDeps = {
  logger: LoggerPort;
  settingsRepo: SalesSettingsRepositoryPort;
  idGenerator: IdGeneratorPort;
  clock: ClockPort;
  idempotency: IdempotencyStoragePort;
  audit: AuditPort;
};

export class GetSalesSettingsUseCase extends BaseUseCase<
  GetSalesSettingsInput,
  GetSalesSettingsOutput
> {
  constructor(private readonly deps: SettingsDeps) {
    super({ logger: deps.logger });
  }

  protected async handle(
    _input: GetSalesSettingsInput,
    ctx: UseCaseContext
  ): Promise<Result<GetSalesSettingsOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId missing from context"));
    }

    let settings = await this.deps.settingsRepo.findByTenant(ctx.tenantId);
    if (!settings) {
      const now = this.deps.clock.now();
      settings = SalesSettingsAggregate.createDefault({
        id: this.deps.idGenerator.newId(),
        tenantId: ctx.tenantId,
        now,
      });
      await this.deps.settingsRepo.save(settings);
    }

    return ok({ settings: toSettingsDto(settings) });
  }
}

export class UpdateSalesSettingsUseCase extends BaseUseCase<
  UpdateSalesSettingsInput,
  UpdateSalesSettingsOutput
> {
  constructor(private readonly deps: SettingsDeps) {
    super({ logger: deps.logger });
  }

  protected async handle(
    input: UpdateSalesSettingsInput,
    ctx: UseCaseContext
  ): Promise<Result<UpdateSalesSettingsOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId missing from context"));
    }

    const cached = await getIdempotentResult<UpdateSalesSettingsOutput>({
      idempotency: this.deps.idempotency,
      actionKey: "sales.update-settings",
      tenantId: ctx.tenantId,
      idempotencyKey: input.idempotencyKey,
    });
    if (cached) {
      return ok(cached);
    }

    const now = this.deps.clock.now();
    let settings = await this.deps.settingsRepo.findByTenant(ctx.tenantId);
    if (!settings) {
      settings = SalesSettingsAggregate.createDefault({
        id: this.deps.idGenerator.newId(),
        tenantId: ctx.tenantId,
        now,
      });
    }

    settings.updateSettings(input.patch, now);
    await this.deps.settingsRepo.save(settings);
    await this.deps.audit.log({
      tenantId: ctx.tenantId,
      userId: ctx.userId ?? "system",
      action: "sales.settings.updated",
      entityType: "SalesSettings",
      entityId: settings.id,
    });

    const result = { settings: toSettingsDto(settings) };
    await storeIdempotentResult({
      idempotency: this.deps.idempotency,
      actionKey: "sales.update-settings",
      tenantId: ctx.tenantId,
      idempotencyKey: input.idempotencyKey,
      body: result,
    });

    return ok(result);
  }
}
