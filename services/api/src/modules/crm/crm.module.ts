import { Module } from "@nestjs/common";
import { DataModule } from "@corely/data";
import { IdentityModule } from "../identity";
import { DealsHttpController } from "./adapters/http/deals.controller";
import {
  ActivitiesHttpController,
  TimelineHttpController,
} from "./adapters/http/activities.controller";
import { PrismaDealRepoAdapter } from "./infrastructure/prisma/prisma-deal-repo.adapter";
import { PrismaActivityRepoAdapter } from "./infrastructure/prisma/prisma-activity-repo.adapter";
import { CLOCK_PORT_TOKEN, type ClockPort } from "../../shared/ports/clock.port";
import { ID_GENERATOR_TOKEN, type IdGeneratorPort } from "../../shared/ports/id-generator.port";
import { KernelModule } from "../../shared/kernel/kernel.module";
import { CrmApplication } from "./application/crm.application";
import { NestLoggerAdapter } from "../../shared/adapters/logger/nest-logger.adapter";
import { DEAL_REPO_PORT } from "./application/ports/deal-repository.port";
import { ACTIVITY_REPO_PORT } from "./application/ports/activity-repository.port";
import { CreateDealUseCase } from "./application/use-cases/create-deal/create-deal.usecase";
import { UpdateDealUseCase } from "./application/use-cases/update-deal/update-deal.usecase";
import { MoveDealStageUseCase } from "./application/use-cases/move-deal-stage/move-deal-stage.usecase";
import { MarkDealWonUseCase } from "./application/use-cases/mark-deal-won/mark-deal-won.usecase";
import { MarkDealLostUseCase } from "./application/use-cases/mark-deal-lost/mark-deal-lost.usecase";
import { ListDealsUseCase } from "./application/use-cases/list-deals/list-deals.usecase";
import { GetDealByIdUseCase } from "./application/use-cases/get-deal-by-id/get-deal-by-id.usecase";
import { CreateActivityUseCase } from "./application/use-cases/create-activity/create-activity.usecase";
import { UpdateActivityUseCase } from "./application/use-cases/update-activity/update-activity.usecase";
import { CompleteActivityUseCase } from "./application/use-cases/complete-activity/complete-activity.usecase";
import { ListActivitiesUseCase } from "./application/use-cases/list-activities/list-activities.usecase";
import { GetTimelineUseCase } from "./application/use-cases/get-timeline/get-timeline.usecase";

@Module({
  imports: [DataModule, IdentityModule, KernelModule],
  controllers: [DealsHttpController, ActivitiesHttpController, TimelineHttpController],
  providers: [
    PrismaDealRepoAdapter,
    PrismaActivityRepoAdapter,
    { provide: DEAL_REPO_PORT, useExisting: PrismaDealRepoAdapter },
    { provide: ACTIVITY_REPO_PORT, useExisting: PrismaActivityRepoAdapter },
    {
      provide: CreateDealUseCase,
      useFactory: (dealRepo: PrismaDealRepoAdapter, idGen: IdGeneratorPort, clock: ClockPort) =>
        new CreateDealUseCase(dealRepo, clock, idGen, new NestLoggerAdapter()),
      inject: [DEAL_REPO_PORT, CLOCK_PORT_TOKEN, ID_GENERATOR_TOKEN],
    },
    {
      provide: UpdateDealUseCase,
      useFactory: (dealRepo: PrismaDealRepoAdapter, clock: ClockPort) =>
        new UpdateDealUseCase(dealRepo, clock, new NestLoggerAdapter()),
      inject: [DEAL_REPO_PORT, CLOCK_PORT_TOKEN],
    },
    {
      provide: MoveDealStageUseCase,
      useFactory: (dealRepo: PrismaDealRepoAdapter, clock: ClockPort) =>
        new MoveDealStageUseCase(dealRepo, clock, new NestLoggerAdapter()),
      inject: [DEAL_REPO_PORT, CLOCK_PORT_TOKEN],
    },
    {
      provide: MarkDealWonUseCase,
      useFactory: (dealRepo: PrismaDealRepoAdapter, clock: ClockPort) =>
        new MarkDealWonUseCase(dealRepo, clock, new NestLoggerAdapter()),
      inject: [DEAL_REPO_PORT, CLOCK_PORT_TOKEN],
    },
    {
      provide: MarkDealLostUseCase,
      useFactory: (dealRepo: PrismaDealRepoAdapter, clock: ClockPort) =>
        new MarkDealLostUseCase(dealRepo, clock, new NestLoggerAdapter()),
      inject: [DEAL_REPO_PORT, CLOCK_PORT_TOKEN],
    },
    {
      provide: ListDealsUseCase,
      useFactory: (dealRepo: PrismaDealRepoAdapter) =>
        new ListDealsUseCase(dealRepo, new NestLoggerAdapter()),
      inject: [DEAL_REPO_PORT],
    },
    {
      provide: GetDealByIdUseCase,
      useFactory: (dealRepo: PrismaDealRepoAdapter) =>
        new GetDealByIdUseCase(dealRepo, new NestLoggerAdapter()),
      inject: [DEAL_REPO_PORT],
    },
    {
      provide: CreateActivityUseCase,
      useFactory: (
        activityRepo: PrismaActivityRepoAdapter,
        idGen: IdGeneratorPort,
        clock: ClockPort
      ) => new CreateActivityUseCase(activityRepo, clock, idGen, new NestLoggerAdapter()),
      inject: [ACTIVITY_REPO_PORT, CLOCK_PORT_TOKEN, ID_GENERATOR_TOKEN],
    },
    {
      provide: UpdateActivityUseCase,
      useFactory: (activityRepo: PrismaActivityRepoAdapter, clock: ClockPort) =>
        new UpdateActivityUseCase(activityRepo, clock, new NestLoggerAdapter()),
      inject: [ACTIVITY_REPO_PORT, CLOCK_PORT_TOKEN],
    },
    {
      provide: CompleteActivityUseCase,
      useFactory: (activityRepo: PrismaActivityRepoAdapter, clock: ClockPort) =>
        new CompleteActivityUseCase(activityRepo, clock, new NestLoggerAdapter()),
      inject: [ACTIVITY_REPO_PORT, CLOCK_PORT_TOKEN],
    },
    {
      provide: ListActivitiesUseCase,
      useFactory: (activityRepo: PrismaActivityRepoAdapter) =>
        new ListActivitiesUseCase(activityRepo, new NestLoggerAdapter()),
      inject: [ACTIVITY_REPO_PORT],
    },
    {
      provide: GetTimelineUseCase,
      useFactory: (activityRepo: PrismaActivityRepoAdapter) =>
        new GetTimelineUseCase(activityRepo, new NestLoggerAdapter()),
      inject: [ACTIVITY_REPO_PORT],
    },
    {
      provide: CrmApplication,
      useFactory: (
        createDeal: CreateDealUseCase,
        updateDeal: UpdateDealUseCase,
        moveDealStage: MoveDealStageUseCase,
        markDealWon: MarkDealWonUseCase,
        markDealLost: MarkDealLostUseCase,
        listDeals: ListDealsUseCase,
        getDealById: GetDealByIdUseCase,
        createActivity: CreateActivityUseCase,
        updateActivity: UpdateActivityUseCase,
        completeActivity: CompleteActivityUseCase,
        listActivities: ListActivitiesUseCase,
        getTimeline: GetTimelineUseCase
      ) =>
        new CrmApplication(
          createDeal,
          updateDeal,
          moveDealStage,
          markDealWon,
          markDealLost,
          listDeals,
          getDealById,
          createActivity,
          updateActivity,
          completeActivity,
          listActivities,
          getTimeline
        ),
      inject: [
        CreateDealUseCase,
        UpdateDealUseCase,
        MoveDealStageUseCase,
        MarkDealWonUseCase,
        MarkDealLostUseCase,
        ListDealsUseCase,
        GetDealByIdUseCase,
        CreateActivityUseCase,
        UpdateActivityUseCase,
        CompleteActivityUseCase,
        ListActivitiesUseCase,
        GetTimelineUseCase,
      ],
    },
  ],
  exports: [CrmApplication],
})
export class CrmModule {}
