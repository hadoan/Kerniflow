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
} from "@corely/kernel";
import type {
  GetSalesSettingsInput,
  GetSalesSettingsOutput,
  UpdateSalesSettingsInput,
  UpdateSalesSettingsOutput,
} from "@corely/contracts";
import type { SalesSettingsRepositoryPort } from "../ports/settings-repository.port";
import { SalesSettingsAggregate } from "../../domain/settings.aggregate";
import { toSettingsDto } from "../mappers/sales-dto.mapper";
import type { IdempotencyStoragePort } from "../../../../shared/ports/idempotency-storage.port";
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
  constructor(private readonly services: SettingsDeps) {
    super({ logger: services.logger });
  }

  protected async handle(
    _input: GetSalesSettingsInput,
    ctx: UseCaseContext
  ): Promise<Result<GetSalesSettingsOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId missing from context"));
    }

    let settings = await this.services.settingsRepo.findByTenant(ctx.tenantId);
    if (!settings) {
      const now = this.services.clock.now();
      settings = SalesSettingsAggregate.createDefault({
        id: this.services.idGenerator.newId(),
        tenantId: ctx.tenantId,
        now,
      });
      await this.services.settingsRepo.save(settings);
    }

    return ok({ settings: toSettingsDto(settings) });
  }
}

export class UpdateSalesSettingsUseCase extends BaseUseCase<
  UpdateSalesSettingsInput,
  UpdateSalesSettingsOutput
> {
  constructor(private readonly services: SettingsDeps) {
    super({ logger: services.logger });
  }

  protected async handle(
    input: UpdateSalesSettingsInput,
    ctx: UseCaseContext
  ): Promise<Result<UpdateSalesSettingsOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId missing from context"));
    }

    const cached = await getIdempotentResult<UpdateSalesSettingsOutput>({
      idempotency: this.services.idempotency,
      actionKey: "sales.update-settings",
      tenantId: ctx.tenantId,
      idempotencyKey: input.idempotencyKey,
    });
    if (cached) {
      return ok(cached);
    }

    const now = this.services.clock.now();
    let settings = await this.services.settingsRepo.findByTenant(ctx.tenantId);
    if (!settings) {
      settings = SalesSettingsAggregate.createDefault({
        id: this.services.idGenerator.newId(),
        tenantId: ctx.tenantId,
        now,
      });
    }

    settings.updateSettings(input.patch, now);
    await this.services.settingsRepo.save(settings);
    await this.services.audit.log({
      tenantId: ctx.tenantId,
      userId: ctx.userId ?? "system",
      action: "sales.settings.updated",
      entityType: "SalesSettings",
      entityId: settings.id,
    });

    const result = { settings: toSettingsDto(settings) };
    await storeIdempotentResult({
      idempotency: this.services.idempotency,
      actionKey: "sales.update-settings",
      tenantId: ctx.tenantId,
      idempotencyKey: input.idempotencyKey,
      body: result,
    });

    return ok(result);
  }
}
