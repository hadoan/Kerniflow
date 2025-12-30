import {
  BaseUseCase,
  type ClockPort,
  type IdGeneratorPort,
  type LoggerPort,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ValidationError,
  err,
  ok,
} from "@corely/kernel";
import type {
  GetPurchasingSettingsInput,
  GetPurchasingSettingsOutput,
  UpdatePurchasingSettingsInput,
  UpdatePurchasingSettingsOutput,
} from "@corely/contracts";
import type { PurchasingSettingsRepositoryPort } from "../ports/settings-repository.port";
import { PurchasingSettingsAggregate } from "../../domain/settings.aggregate";
import { toSettingsDto } from "../mappers/purchasing-dto.mapper";
import type { IdempotencyStoragePort } from "../../../../shared/ports/idempotency-storage.port";
import { getIdempotentResult, storeIdempotentResult } from "./idempotency";

type SettingsDeps = {
  logger: LoggerPort;
  settingsRepo: PurchasingSettingsRepositoryPort;
  idGenerator: IdGeneratorPort;
  clock: ClockPort;
  idempotency: IdempotencyStoragePort;
};

export class GetPurchasingSettingsUseCase extends BaseUseCase<
  GetPurchasingSettingsInput,
  GetPurchasingSettingsOutput
> {
  constructor(private readonly services: SettingsDeps) {
    super({ logger: services.logger });
  }

  protected async handle(
    _input: GetPurchasingSettingsInput,
    ctx: UseCaseContext
  ): Promise<Result<GetPurchasingSettingsOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId missing from context"));
    }

    let settings = await this.services.settingsRepo.findByTenant(ctx.tenantId);
    if (!settings) {
      settings = PurchasingSettingsAggregate.createDefault({
        id: this.services.idGenerator.newId(),
        tenantId: ctx.tenantId,
        now: this.services.clock.now(),
      });
      await this.services.settingsRepo.save(settings);
    }

    return ok({ settings: toSettingsDto(settings) });
  }
}

export class UpdatePurchasingSettingsUseCase extends BaseUseCase<
  UpdatePurchasingSettingsInput,
  UpdatePurchasingSettingsOutput
> {
  constructor(private readonly services: SettingsDeps) {
    super({ logger: services.logger });
  }

  protected async handle(
    input: UpdatePurchasingSettingsInput,
    ctx: UseCaseContext
  ): Promise<Result<UpdatePurchasingSettingsOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId missing from context"));
    }

    const cached = await getIdempotentResult<UpdatePurchasingSettingsOutput>({
      idempotency: this.services.idempotency,
      actionKey: "purchasing.update-settings",
      tenantId: ctx.tenantId,
      idempotencyKey: input.idempotencyKey,
    });
    if (cached) {
      return ok(cached);
    }

    let settings = await this.services.settingsRepo.findByTenant(ctx.tenantId);
    if (!settings) {
      settings = PurchasingSettingsAggregate.createDefault({
        id: this.services.idGenerator.newId(),
        tenantId: ctx.tenantId,
        now: this.services.clock.now(),
      });
    }

    settings.updateSettings(
      {
        defaultPaymentTerms: input.defaultPaymentTerms,
        defaultCurrency: input.defaultCurrency ?? settings.toProps().defaultCurrency,
        poNumberingPrefix: input.poNumberingPrefix ?? settings.toProps().poNumberingPrefix,
        billInternalRefPrefix:
          input.billInternalRefPrefix ?? settings.toProps().billInternalRefPrefix,
        defaultAccountsPayableAccountId: input.defaultAccountsPayableAccountId,
        defaultExpenseAccountId: input.defaultExpenseAccountId,
        defaultBankAccountId: input.defaultBankAccountId,
        autoPostOnBillPost: input.autoPostOnBillPost ?? settings.toProps().autoPostOnBillPost,
        autoPostOnPaymentRecord:
          input.autoPostOnPaymentRecord ?? settings.toProps().autoPostOnPaymentRecord,
        billDuplicateDetectionEnabled:
          input.billDuplicateDetectionEnabled ?? settings.toProps().billDuplicateDetectionEnabled,
        approvalRequiredForBills:
          input.approvalRequiredForBills ?? settings.toProps().approvalRequiredForBills,
      },
      this.services.clock.now()
    );

    await this.services.settingsRepo.save(settings);

    const result = { settings: toSettingsDto(settings) };
    await storeIdempotentResult({
      idempotency: this.services.idempotency,
      actionKey: "purchasing.update-settings",
      tenantId: ctx.tenantId,
      idempotencyKey: input.idempotencyKey,
      body: result,
    });

    return ok(result);
  }
}
