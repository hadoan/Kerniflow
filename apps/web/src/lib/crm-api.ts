import { apiClient } from "./api-client";
import type {
  CreateDealInput,
  CreateDealOutput,
  UpdateDealInput,
  UpdateDealOutput,
  MoveDealStageOutput,
  MarkDealWonOutput,
  MarkDealLostOutput,
  ListDealsOutput,
  GetDealOutput,
  DealDto,
  CreateActivityInput,
  CreateActivityOutput,
  UpdateActivityInput,
  UpdateActivityOutput,
  CompleteActivityOutput,
  ListActivitiesOutput,
  GetTimelineOutput,
  ActivityDto,
  TimelineItem,
} from "@corely/contracts";

export const crmApi = {
  // ============================================================
  // Deal Operations
  // ============================================================
  async createDeal(input: CreateDealInput): Promise<DealDto> {
    const response = await apiClient.post<CreateDealOutput>("/crm/deals", input);
    return response.deal;
  },

  async updateDeal(id: string, patch: Partial<UpdateDealInput>): Promise<DealDto> {
    const response = await apiClient.patch<UpdateDealOutput>(`/crm/deals/${id}`, patch);
    return response.deal;
  },

  async moveDealStage(id: string, newStageId: string): Promise<DealDto> {
    const response = await apiClient.post<MoveDealStageOutput>(`/crm/deals/${id}/move-stage`, {
      newStageId,
    });
    return response.deal;
  },

  async markDealWon(id: string, wonAt?: string): Promise<DealDto> {
    const response = await apiClient.post<MarkDealWonOutput>(`/crm/deals/${id}/mark-won`, {
      wonAt,
    });
    return response.deal;
  },

  async markDealLost(id: string, lostReason?: string, lostAt?: string): Promise<DealDto> {
    const response = await apiClient.post<MarkDealLostOutput>(`/crm/deals/${id}/mark-lost`, {
      lostReason,
      lostAt,
    });
    return response.deal;
  },

  async getDeal(id: string): Promise<DealDto> {
    const response = await apiClient.get<GetDealOutput>(`/crm/deals/${id}`);
    return response.deal;
  },

  async listDeals(params?: {
    partyId?: string;
    stageId?: string;
    status?: string;
    ownerUserId?: string;
    cursor?: string;
    pageSize?: number;
  }): Promise<{ deals: DealDto[]; nextCursor?: string }> {
    const queryParams = new URLSearchParams();
    if (params?.partyId) {
      queryParams.append("partyId", params.partyId);
    }
    if (params?.stageId) {
      queryParams.append("stageId", params.stageId);
    }
    if (params?.status) {
      queryParams.append("status", params.status);
    }
    if (params?.ownerUserId) {
      queryParams.append("ownerUserId", params.ownerUserId);
    }
    if (params?.cursor) {
      queryParams.append("cursor", params.cursor);
    }
    if (params?.pageSize) {
      queryParams.append("pageSize", params.pageSize.toString());
    }
    const queryString = queryParams.toString();
    const endpoint = queryString ? `/crm/deals?${queryString}` : "/crm/deals";

    const response = await apiClient.get<ListDealsOutput>(endpoint);
    return { deals: response.deals, nextCursor: response.nextCursor };
  },

  // ============================================================
  // Activity Operations
  // ============================================================
  async createActivity(input: CreateActivityInput): Promise<ActivityDto> {
    const response = await apiClient.post<CreateActivityOutput>("/crm/activities", input);
    return response.activity;
  },

  async updateActivity(id: string, patch: Partial<UpdateActivityInput>): Promise<ActivityDto> {
    const response = await apiClient.patch<UpdateActivityOutput>(`/crm/activities/${id}`, patch);
    return response.activity;
  },

  async completeActivity(id: string, completedAt?: string): Promise<ActivityDto> {
    const response = await apiClient.post<CompleteActivityOutput>(
      `/crm/activities/${id}/complete`,
      {
        completedAt,
      }
    );
    return response.activity;
  },

  async listActivities(params?: {
    partyId?: string;
    dealId?: string;
    type?: string;
    status?: string;
    assignedToUserId?: string;
    cursor?: string;
    pageSize?: number;
  }): Promise<{ activities: ActivityDto[]; nextCursor?: string }> {
    const queryParams = new URLSearchParams();
    if (params?.partyId) {
      queryParams.append("partyId", params.partyId);
    }
    if (params?.dealId) {
      queryParams.append("dealId", params.dealId);
    }
    if (params?.type) {
      queryParams.append("type", params.type);
    }
    if (params?.status) {
      queryParams.append("status", params.status);
    }
    if (params?.assignedToUserId) {
      queryParams.append("assignedToUserId", params.assignedToUserId);
    }
    if (params?.cursor) {
      queryParams.append("cursor", params.cursor);
    }
    if (params?.pageSize) {
      queryParams.append("pageSize", params.pageSize.toString());
    }
    const queryString = queryParams.toString();
    const endpoint = queryString ? `/crm/activities?${queryString}` : "/crm/activities";

    const response = await apiClient.get<ListActivitiesOutput>(endpoint);
    return { activities: response.activities, nextCursor: response.nextCursor };
  },

  // ============================================================
  // Timeline Operations
  // ============================================================
  async getTimeline(
    entityType: "party" | "deal",
    entityId: string,
    params?: {
      cursor?: string;
      pageSize?: number;
    }
  ): Promise<{ items: TimelineItem[]; nextCursor?: string }> {
    const queryParams = new URLSearchParams();
    if (params?.cursor) {
      queryParams.append("cursor", params.cursor);
    }
    if (params?.pageSize) {
      queryParams.append("pageSize", params.pageSize.toString());
    }
    const queryString = queryParams.toString();
    const endpoint = queryString
      ? `/crm/timeline/${entityType}/${entityId}?${queryString}`
      : `/crm/timeline/${entityType}/${entityId}`;

    const response = await apiClient.get<GetTimelineOutput>(endpoint);
    return { items: response.items, nextCursor: response.nextCursor };
  },
};
