import type {
  CreateDealInput,
  UpdateDealInput,
  ListDealsOutput,
  DealDto,
  CreateActivityInput,
  UpdateActivityInput,
  ListActivitiesOutput,
  GetTimelineOutput,
  ActivityDto,
  TimelineItem,
  ChannelDefinition,
} from "@corely/contracts";
import type { LogMessageInput, LogMessageOutput, ListChannelsOutput } from "@corely/contracts";
import { apiClient } from "./api-client";

const unwrapDealResponse = (response: unknown): DealDto => {
  if (response && typeof response === "object") {
    if ("deal" in response) {
      return (response as { deal: DealDto }).deal;
    }
    if ("data" in response) {
      const data = (response as { data?: unknown }).data;
      if (data && typeof data === "object") {
        if ("deal" in data) {
          return (data as { deal: DealDto }).deal;
        }
        if ("id" in data) {
          return data as DealDto;
        }
      }
    }
    if ("id" in response) {
      return response as DealDto;
    }
  }

  return response as DealDto;
};

const unwrapActivityResponse = (response: unknown): ActivityDto => {
  if (response && typeof response === "object") {
    if ("activity" in response) {
      return (response as { activity: ActivityDto }).activity;
    }
    if ("data" in response) {
      const data = (response as { data?: unknown }).data;
      if (data && typeof data === "object") {
        if ("activity" in data) {
          return (data as { activity: ActivityDto }).activity;
        }
        if ("id" in data) {
          return data as ActivityDto;
        }
      }
    }
    if ("id" in response) {
      return response as ActivityDto;
    }
  }

  return response as ActivityDto;
};

export const crmApi = {
  // ============================================================
  // Deal Operations
  // ============================================================
  async createDeal(input: CreateDealInput): Promise<DealDto> {
    const response = await apiClient.post<unknown>("/crm/deals", input);
    return unwrapDealResponse(response);
  },

  async updateDeal(id: string, patch: Partial<UpdateDealInput>): Promise<DealDto> {
    const response = await apiClient.patch<unknown>(`/crm/deals/${id}`, patch);
    return unwrapDealResponse(response);
  },

  async moveDealStage(id: string, newStageId: string): Promise<DealDto> {
    const response = await apiClient.post<unknown>(`/crm/deals/${id}/move-stage`, {
      newStageId,
    });
    return unwrapDealResponse(response);
  },

  async markDealWon(id: string, wonAt?: string): Promise<DealDto> {
    const response = await apiClient.post<unknown>(`/crm/deals/${id}/mark-won`, {
      wonAt,
    });
    return unwrapDealResponse(response);
  },

  async markDealLost(id: string, lostReason?: string, lostAt?: string): Promise<DealDto> {
    const response = await apiClient.post<unknown>(`/crm/deals/${id}/mark-lost`, {
      lostReason,
      lostAt,
    });
    return unwrapDealResponse(response);
  },

  async getDeal(id: string): Promise<DealDto> {
    const response = await apiClient.get<unknown>(`/crm/deals/${id}`);
    return unwrapDealResponse(response);
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
    return { deals: response.items, nextCursor: response.nextCursor ?? undefined };
  },

  // ============================================================
  // Activity Operations
  // ============================================================
  async createActivity(input: CreateActivityInput): Promise<ActivityDto> {
    const response = await apiClient.post<unknown>("/crm/activities", input);
    return unwrapActivityResponse(response);
  },

  async updateActivity(id: string, patch: Partial<UpdateActivityInput>): Promise<ActivityDto> {
    const response = await apiClient.patch<unknown>(`/crm/activities/${id}`, patch);
    return unwrapActivityResponse(response);
  },

  async completeActivity(id: string, completedAt?: string): Promise<ActivityDto> {
    const response = await apiClient.post<unknown>(`/crm/activities/${id}/complete`, {
      completedAt,
    });
    return unwrapActivityResponse(response);
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
    return { activities: response.items, nextCursor: response.nextCursor ?? undefined };
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

  // ============================================================
  // Channel Operations
  // ============================================================
  async listChannels(): Promise<ChannelDefinition[]> {
    const response = await apiClient.get<ListChannelsOutput>("/crm/channels");
    return response.channels;
  },

  async logMessage(input: LogMessageInput): Promise<ActivityDto> {
    const response = await apiClient.post<LogMessageOutput>(
      `/crm/deals/${input.dealId}/messages`,
      input
    );
    return response.activity;
  },
};
