import { Module } from "@nestjs/common";
import { DataModule } from "@kerniflow/data";
import { IdentityModule } from "../identity";
import { EngagementController } from "./adapters/http/engagement.controller";
import { PrismaCheckInRepositoryAdapter } from "./infrastructure/adapters/prisma-checkin-repository.adapter";
import { PrismaLoyaltyRepositoryAdapter } from "./infrastructure/adapters/prisma-loyalty-repository.adapter";
import { PrismaEngagementSettingsRepositoryAdapter } from "./infrastructure/adapters/prisma-engagement-settings-repository.adapter";
import { CHECKIN_REPOSITORY_PORT } from "./application/ports/checkin-repository.port";
import { LOYALTY_REPOSITORY_PORT } from "./application/ports/loyalty-repository.port";
import { ENGAGEMENT_SETTINGS_REPOSITORY_PORT } from "./application/ports/engagement-settings-repository.port";
import { CreateCheckInEventUseCase } from "./application/use-cases/create-checkin.usecase";
import { ListCheckInEventsUseCase } from "./application/use-cases/list-checkins.usecase";
import { CancelCheckInEventUseCase } from "./application/use-cases/cancel-checkin.usecase";
import { CompleteCheckInEventUseCase } from "./application/use-cases/complete-checkin.usecase";
import { GetLoyaltySummaryUseCase } from "./application/use-cases/get-loyalty-summary.usecase";
import { ListLoyaltyLedgerUseCase } from "./application/use-cases/list-loyalty-ledger.usecase";
import { CreateLoyaltyEarnEntryUseCase } from "./application/use-cases/create-loyalty-earn.usecase";
import { CreateLoyaltyAdjustEntryUseCase } from "./application/use-cases/create-loyalty-adjust.usecase";
import { GetEngagementSettingsUseCase } from "./application/use-cases/get-engagement-settings.usecase";
import { UpdateEngagementSettingsUseCase } from "./application/use-cases/update-engagement-settings.usecase";
import { EngagementApplication } from "./application/engagement.application";
import { NestLoggerAdapter } from "../../shared/adapters/logger/nest-logger.adapter";

@Module({
  imports: [DataModule, IdentityModule],
  controllers: [EngagementController],
  providers: [
    PrismaCheckInRepositoryAdapter,
    PrismaLoyaltyRepositoryAdapter,
    PrismaEngagementSettingsRepositoryAdapter,
    NestLoggerAdapter,

    { provide: CHECKIN_REPOSITORY_PORT, useExisting: PrismaCheckInRepositoryAdapter },
    { provide: LOYALTY_REPOSITORY_PORT, useExisting: PrismaLoyaltyRepositoryAdapter },
    {
      provide: ENGAGEMENT_SETTINGS_REPOSITORY_PORT,
      useExisting: PrismaEngagementSettingsRepositoryAdapter,
    },

    {
      provide: CreateCheckInEventUseCase,
      useFactory: (
        checkins: PrismaCheckInRepositoryAdapter,
        loyalty: PrismaLoyaltyRepositoryAdapter,
        settings: PrismaEngagementSettingsRepositoryAdapter,
        logger: NestLoggerAdapter
      ) =>
        new CreateCheckInEventUseCase({
          checkins,
          loyalty,
          settings,
          logger,
        }),
      inject: [
        PrismaCheckInRepositoryAdapter,
        PrismaLoyaltyRepositoryAdapter,
        PrismaEngagementSettingsRepositoryAdapter,
        NestLoggerAdapter,
      ],
    },
    {
      provide: ListCheckInEventsUseCase,
      useFactory: (checkins: PrismaCheckInRepositoryAdapter, logger: NestLoggerAdapter) =>
        new ListCheckInEventsUseCase({ checkins, logger }),
      inject: [PrismaCheckInRepositoryAdapter, NestLoggerAdapter],
    },
    {
      provide: CancelCheckInEventUseCase,
      useFactory: (checkins: PrismaCheckInRepositoryAdapter, logger: NestLoggerAdapter) =>
        new CancelCheckInEventUseCase({ checkins, logger }),
      inject: [PrismaCheckInRepositoryAdapter, NestLoggerAdapter],
    },
    {
      provide: CompleteCheckInEventUseCase,
      useFactory: (checkins: PrismaCheckInRepositoryAdapter, logger: NestLoggerAdapter) =>
        new CompleteCheckInEventUseCase({ checkins, logger }),
      inject: [PrismaCheckInRepositoryAdapter, NestLoggerAdapter],
    },
    {
      provide: GetLoyaltySummaryUseCase,
      useFactory: (loyalty: PrismaLoyaltyRepositoryAdapter, logger: NestLoggerAdapter) =>
        new GetLoyaltySummaryUseCase({ loyalty, logger }),
      inject: [PrismaLoyaltyRepositoryAdapter, NestLoggerAdapter],
    },
    {
      provide: ListLoyaltyLedgerUseCase,
      useFactory: (loyalty: PrismaLoyaltyRepositoryAdapter, logger: NestLoggerAdapter) =>
        new ListLoyaltyLedgerUseCase({ loyalty, logger }),
      inject: [PrismaLoyaltyRepositoryAdapter, NestLoggerAdapter],
    },
    {
      provide: CreateLoyaltyEarnEntryUseCase,
      useFactory: (loyalty: PrismaLoyaltyRepositoryAdapter, logger: NestLoggerAdapter) =>
        new CreateLoyaltyEarnEntryUseCase({ loyalty, logger }),
      inject: [PrismaLoyaltyRepositoryAdapter, NestLoggerAdapter],
    },
    {
      provide: CreateLoyaltyAdjustEntryUseCase,
      useFactory: (loyalty: PrismaLoyaltyRepositoryAdapter, logger: NestLoggerAdapter) =>
        new CreateLoyaltyAdjustEntryUseCase({ loyalty, logger }),
      inject: [PrismaLoyaltyRepositoryAdapter, NestLoggerAdapter],
    },
    {
      provide: GetEngagementSettingsUseCase,
      useFactory: (
        settings: PrismaEngagementSettingsRepositoryAdapter,
        logger: NestLoggerAdapter
      ) => new GetEngagementSettingsUseCase({ settings, logger }),
      inject: [PrismaEngagementSettingsRepositoryAdapter, NestLoggerAdapter],
    },
    {
      provide: UpdateEngagementSettingsUseCase,
      useFactory: (
        settings: PrismaEngagementSettingsRepositoryAdapter,
        logger: NestLoggerAdapter
      ) => new UpdateEngagementSettingsUseCase({ settings, logger }),
      inject: [PrismaEngagementSettingsRepositoryAdapter, NestLoggerAdapter],
    },
    {
      provide: EngagementApplication,
      useFactory: (
        createCheckIn: CreateCheckInEventUseCase,
        listCheckIns: ListCheckInEventsUseCase,
        cancelCheckIn: CancelCheckInEventUseCase,
        completeCheckIn: CompleteCheckInEventUseCase,
        getLoyaltySummary: GetLoyaltySummaryUseCase,
        listLoyaltyLedger: ListLoyaltyLedgerUseCase,
        createLoyaltyEarn: CreateLoyaltyEarnEntryUseCase,
        createLoyaltyAdjust: CreateLoyaltyAdjustEntryUseCase,
        getSettings: GetEngagementSettingsUseCase,
        updateSettings: UpdateEngagementSettingsUseCase
      ) =>
        new EngagementApplication(
          createCheckIn,
          listCheckIns,
          cancelCheckIn,
          completeCheckIn,
          getLoyaltySummary,
          listLoyaltyLedger,
          createLoyaltyEarn,
          createLoyaltyAdjust,
          getSettings,
          updateSettings
        ),
      inject: [
        CreateCheckInEventUseCase,
        ListCheckInEventsUseCase,
        CancelCheckInEventUseCase,
        CompleteCheckInEventUseCase,
        GetLoyaltySummaryUseCase,
        ListLoyaltyLedgerUseCase,
        CreateLoyaltyEarnEntryUseCase,
        CreateLoyaltyAdjustEntryUseCase,
        GetEngagementSettingsUseCase,
        UpdateEngagementSettingsUseCase,
      ],
    },
  ],
  exports: [EngagementApplication],
})
export class EngagementModule {}
