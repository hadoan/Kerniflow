import {
  BaseUseCase,
  type LoggerPort,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ValidationError,
  ok,
  err,
} from "@corely/kernel";
import {
  type GetEngagementSettingsInput,
  type GetEngagementSettingsOutput,
} from "@corely/contracts";
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

export class GetEngagementSettingsUseCase extends BaseUseCase<
  GetEngagementSettingsInput,
  GetEngagementSettingsOutput
> {
  constructor(protected readonly deps: Deps) {
    super({ logger: deps.logger });
  }

  protected async handle(
    _input: GetEngagementSettingsInput,
    ctx: UseCaseContext
  ): Promise<Result<GetEngagementSettingsOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId is required"));
    }

    let settings = await this.deps.settings.getByTenant(ctx.tenantId);
    if (!settings) {
      settings = defaultSettings(ctx.tenantId);
      await this.deps.settings.upsert(settings);
    }

    return ok({ settings: toEngagementSettingsDto(settings) });
  }
}
