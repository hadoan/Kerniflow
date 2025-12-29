import type { ArchiveCustomerUseCase } from "./use-cases/archive-customer/archive-customer.usecase";
import type { CreateCustomerUseCase } from "./use-cases/create-customer/create-customer.usecase";
import type { GetCustomerByIdUseCase } from "./use-cases/get-customer-by-id/get-customer-by-id.usecase";
import type { ListCustomersUseCase } from "./use-cases/list-customers/list-customers.usecase";
import type { SearchCustomersUseCase } from "./use-cases/search-customers/search-customers.usecase";
import type { UnarchiveCustomerUseCase } from "./use-cases/unarchive-customer/unarchive-customer.usecase";
import type { UpdateCustomerUseCase } from "./use-cases/update-customer/update-customer.usecase";
import type { CreateDealUseCase } from "./use-cases/create-deal/create-deal.usecase";
import type { UpdateDealUseCase } from "./use-cases/update-deal/update-deal.usecase";
import type { MoveDealStageUseCase } from "./use-cases/move-deal-stage/move-deal-stage.usecase";
import type { MarkDealWonUseCase } from "./use-cases/mark-deal-won/mark-deal-won.usecase";
import type { MarkDealLostUseCase } from "./use-cases/mark-deal-lost/mark-deal-lost.usecase";
import type { ListDealsUseCase } from "./use-cases/list-deals/list-deals.usecase";
import type { GetDealByIdUseCase } from "./use-cases/get-deal-by-id/get-deal-by-id.usecase";
import type { CreateActivityUseCase } from "./use-cases/create-activity/create-activity.usecase";
import type { UpdateActivityUseCase } from "./use-cases/update-activity/update-activity.usecase";
import type { CompleteActivityUseCase } from "./use-cases/complete-activity/complete-activity.usecase";
import type { ListActivitiesUseCase } from "./use-cases/list-activities/list-activities.usecase";
import type { GetTimelineUseCase } from "./use-cases/get-timeline/get-timeline.usecase";

export class PartyCrmApplication {
  constructor(
    // Customer use cases (legacy)
    public readonly createCustomer: CreateCustomerUseCase,
    public readonly updateCustomer: UpdateCustomerUseCase,
    public readonly archiveCustomer: ArchiveCustomerUseCase,
    public readonly unarchiveCustomer: UnarchiveCustomerUseCase,
    public readonly getCustomerById: GetCustomerByIdUseCase,
    public readonly listCustomers: ListCustomersUseCase,
    public readonly searchCustomers: SearchCustomersUseCase,
    // Deal use cases
    public readonly createDeal: CreateDealUseCase,
    public readonly updateDeal: UpdateDealUseCase,
    public readonly moveDealStage: MoveDealStageUseCase,
    public readonly markDealWon: MarkDealWonUseCase,
    public readonly markDealLost: MarkDealLostUseCase,
    public readonly listDeals: ListDealsUseCase,
    public readonly getDealById: GetDealByIdUseCase,
    // Activity use cases
    public readonly createActivity: CreateActivityUseCase,
    public readonly updateActivity: UpdateActivityUseCase,
    public readonly completeActivity: CompleteActivityUseCase,
    public readonly listActivities: ListActivitiesUseCase,
    public readonly getTimeline: GetTimelineUseCase
  ) {}
}
