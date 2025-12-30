import {
  BaseUseCase,
  type LoggerPort,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ValidationError,
  ConflictError,
  ok,
  err,
} from "@corely/kernel";
import { type CreateCheckInEventInput, type CreateCheckInEventOutput } from "@corely/contracts";
import { toCheckInEventDto } from "../mappers/engagement-dto.mappers";
import type { CheckInRepositoryPort } from "../ports/checkin-repository.port";
import type { LoyaltyRepositoryPort } from "../ports/loyalty-repository.port";
import type { EngagementSettingsRepositoryPort } from "../ports/engagement-settings-repository.port";
import type { EngagementSettingsRecord } from "../../domain/engagement.types";
import { v4 as uuidv4 } from "@lukeed/uuid";

type Deps = {
  logger: LoggerPort;
  checkins: CheckInRepositoryPort;
  loyalty: LoyaltyRepositoryPort;
  settings: EngagementSettingsRepositoryPort;
};

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

export class CreateCheckInEventUseCase extends BaseUseCase<
  CreateCheckInEventInput,
  CreateCheckInEventOutput
> {
  constructor(protected readonly deps: Deps) {
    super({ logger: deps.logger });
  }

  protected async handle(
    input: CreateCheckInEventInput,
    ctx: UseCaseContext
  ): Promise<Result<CreateCheckInEventOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId is required"));
    }

    const tenantId = ctx.tenantId;
    const existingById = await this.deps.checkins.findById(tenantId, input.checkInEventId);
    if (existingById) {
      return ok({
        checkInEvent: toCheckInEventDto(existingById),
        pointsAwarded: null,
      });
    }

    const checkedInAt = input.checkedInAt ? new Date(input.checkedInAt) : new Date();
    const existingSettings = await this.deps.settings.getByTenant(tenantId);
    const settings = existingSettings ?? defaultSettings(tenantId);

    if (!settings.checkInModeEnabled) {
      return err(new ConflictError("Check-in mode is disabled", { code: "CHECKIN_DISABLED" }));
    }

    const duplicateWindowMs = settings.checkInDuplicateWindowMinutes * 60 * 1000;
    const since = new Date(checkedInAt.getTime() - duplicateWindowMs);
    const recent = await this.deps.checkins.findRecentForCustomer(
      tenantId,
      input.customerPartyId,
      since
    );

    if (recent.length > 0 && !input.overrideDuplicate) {
      const previous = recent[0];
      return err(
        new ConflictError(
          "Duplicate check-in detected",
          {
            code: "DUPLICATE_CHECKIN",
            previousCheckInEventId: previous.checkInEventId,
            previousCheckedInAt: previous.checkedInAt,
          },
          "DUPLICATE_CHECKIN"
        )
      );
    }

    const now = new Date();
    const record = {
      checkInEventId: input.checkInEventId,
      tenantId,
      customerPartyId: input.customerPartyId,
      registerId: input.registerId,
      kioskDeviceId: input.kioskDeviceId ?? null,
      checkedInAt,
      checkedInByType: input.checkedInByType,
      checkedInByEmployeePartyId: input.checkedInByEmployeePartyId ?? null,
      status: "ACTIVE" as const,
      visitReason: input.visitReason ?? null,
      assignedEmployeePartyId: input.assignedEmployeePartyId ?? null,
      tags: input.tags ?? [],
      posSaleId: input.posSaleId ?? null,
      notes: input.notes ?? null,
      createdAt: now,
      updatedAt: now,
    };

    await this.deps.checkins.create(record);

    let pointsAwarded: number | null = null;
    if (settings.loyaltyEnabled && settings.pointsPerVisit > 0) {
      const existing = await this.deps.loyalty.findLedgerEntryBySource(
        tenantId,
        "CHECKIN",
        input.checkInEventId,
        "VISIT_CHECKIN"
      );
      if (!existing) {
        const entryId = uuidv4();
        await this.deps.loyalty.createLedgerEntry({
          entryId,
          tenantId,
          customerPartyId: input.customerPartyId,
          entryType: "EARN",
          pointsDelta: settings.pointsPerVisit,
          reasonCode: "VISIT_CHECKIN",
          sourceType: "CHECKIN",
          sourceId: input.checkInEventId,
          createdAt: now,
          createdByEmployeePartyId: input.checkedInByEmployeePartyId ?? null,
        });

        const account =
          (await this.deps.loyalty.getAccountByCustomer(tenantId, input.customerPartyId)) ??
          (await this.deps.loyalty.upsertAccount(tenantId, input.customerPartyId, "ACTIVE"));
        await this.deps.loyalty.updateAccountBalance(
          tenantId,
          input.customerPartyId,
          account.currentPointsBalance + settings.pointsPerVisit
        );
        pointsAwarded = settings.pointsPerVisit;
      }
    }

    if (!existingSettings) {
      await this.deps.settings.upsert(settings);
    }

    return ok({
      checkInEvent: toCheckInEventDto(record),
      pointsAwarded,
    });
  }
}
