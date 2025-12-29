import {
  BaseUseCase,
  type LoggerPort,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ValidationError,
  ok,
  err,
} from "@kerniflow/kernel";
import {
  type UpdateEngagementSettingsInput,
  type UpdateEngagementSettingsOutput,
} from "@kerniflow/contracts";
import { toEngagementSettingsDto } from "../mappers/engagement-dto.mappers";
import type { EngagementSettingsRepositoryPort } from "../ports/engagement-settings-repository.port";
import type { EngagementSettingsRecord } from "../../domain/engagement.types";

type Deps = { logger: LoggerPort; settings: EngagementSettingsRepositoryPort };

const defaultSettings = (tenantId: string): EngagementSettingsRecord => {
  const now = new Date();
  return {
    tenantId,
    checkInModeEnabled: true,
    checkInDuplicateWindowMinutes: 10,
    loyaltyEnabled: true,
    pointsPerVisit: 1,
    rewardRules: [],
    aiEnabled: true,
    kioskBranding: null,
    createdAt: now,
    updatedAt: now,
  };
};

export class UpdateEngagementSettingsUseCase extends BaseUseCase<
  UpdateEngagementSettingsInput,
  UpdateEngagementSettingsOutput
> {
  constructor(private readonly deps: Deps) {
    super({ logger: deps.logger });
  }

  protected async handle(
    input: UpdateEngagementSettingsInput,
    ctx: UseCaseContext
  ): Promise<Result<UpdateEngagementSettingsOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId is required"));
    }

    const existing =
      (await this.deps.settings.getByTenant(ctx.tenantId)) ?? defaultSettings(ctx.tenantId);
    const updated: EngagementSettingsRecord = {
      ...existing,
      checkInModeEnabled: input.checkInModeEnabled ?? existing.checkInModeEnabled,
      checkInDuplicateWindowMinutes:
        input.checkInDuplicateWindowMinutes ?? existing.checkInDuplicateWindowMinutes,
      loyaltyEnabled: input.loyaltyEnabled ?? existing.loyaltyEnabled,
      pointsPerVisit: input.pointsPerVisit ?? existing.pointsPerVisit,
      rewardRules: input.rewardRules ?? existing.rewardRules,
      aiEnabled: input.aiEnabled ?? existing.aiEnabled,
      kioskBranding: input.kioskBranding ?? existing.kioskBranding,
      updatedAt: new Date(),
    };

    await this.deps.settings.upsert(updated);

    return ok({ settings: toEngagementSettingsDto(updated) });
  }
}
