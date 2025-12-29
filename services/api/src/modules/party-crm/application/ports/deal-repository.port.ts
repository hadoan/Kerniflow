import { type DealAggregate, type DealStatus } from "../../domain/deal.aggregate";

export type DealStageTransition = {
  tenantId: string;
  dealId: string;
  fromStageId: string | null;
  toStageId: string;
  transitionedByUserId: string | null;
  transitionedAt: Date;
};

export type ListDealsFilters = {
  partyId?: string;
  stageId?: string;
  status?: DealStatus;
  ownerUserId?: string;
};

export type ListDealsResult = {
  items: DealAggregate[];
  nextCursor?: string | null;
};

export interface DealRepoPort {
  findById(tenantId: string, dealId: string): Promise<DealAggregate | null>;
  list(
    tenantId: string,
    filters: ListDealsFilters,
    pageSize?: number,
    cursor?: string
  ): Promise<ListDealsResult>;
  create(tenantId: string, deal: DealAggregate): Promise<void>;
  update(tenantId: string, deal: DealAggregate): Promise<void>;
  recordStageTransition(transition: DealStageTransition): Promise<void>;
  getStageTransitions(
    tenantId: string,
    dealId: string,
    limit?: number
  ): Promise<DealStageTransition[]>;
}

export const DEAL_REPO_PORT = Symbol("DealRepoPort");
