import type { CreateCheckInEventUseCase } from "./use-cases/create-checkin.usecase";
import type { ListCheckInEventsUseCase } from "./use-cases/list-checkins.usecase";
import type { CancelCheckInEventUseCase } from "./use-cases/cancel-checkin.usecase";
import type { CompleteCheckInEventUseCase } from "./use-cases/complete-checkin.usecase";
import type { GetLoyaltySummaryUseCase } from "./use-cases/get-loyalty-summary.usecase";
import type { ListLoyaltyLedgerUseCase } from "./use-cases/list-loyalty-ledger.usecase";
import type { CreateLoyaltyEarnEntryUseCase } from "./use-cases/create-loyalty-earn.usecase";
import type { CreateLoyaltyAdjustEntryUseCase } from "./use-cases/create-loyalty-adjust.usecase";
import type { GetEngagementSettingsUseCase } from "./use-cases/get-engagement-settings.usecase";
import type { UpdateEngagementSettingsUseCase } from "./use-cases/update-engagement-settings.usecase";

export class EngagementApplication {
  constructor(
    public readonly createCheckIn: CreateCheckInEventUseCase,
    public readonly listCheckIns: ListCheckInEventsUseCase,
    public readonly cancelCheckIn: CancelCheckInEventUseCase,
    public readonly completeCheckIn: CompleteCheckInEventUseCase,
    public readonly getLoyaltySummary: GetLoyaltySummaryUseCase,
    public readonly listLoyaltyLedger: ListLoyaltyLedgerUseCase,
    public readonly createLoyaltyEarn: CreateLoyaltyEarnEntryUseCase,
    public readonly createLoyaltyAdjust: CreateLoyaltyAdjustEntryUseCase,
    public readonly getSettings: GetEngagementSettingsUseCase,
    public readonly updateSettings: UpdateEngagementSettingsUseCase
  ) {}
}
