import {
  type ActivityEntity,
  type ActivityStatus,
  type ActivityType,
} from "../../domain/activity.entity";

export type ListActivitiesFilters = {
  partyId?: string;
  dealId?: string;
  assignedToUserId?: string;
  status?: ActivityStatus;
  type?: ActivityType;
};

export type ListActivitiesResult = {
  items: ActivityEntity[];
  nextCursor?: string | null;
};

export type TimelineItem = {
  id: string;
  type: "ACTIVITY" | "STAGE_TRANSITION" | "NOTE" | "MESSAGE";
  timestamp: Date;
  subject: string;
  body: string | null;
  actorUserId: string | null;
  channelKey?: string;
  direction?: string;
  to?: string;
  openUrl?: string;
  metadata?: Record<string, unknown>;
};

export type TimelineResult = {
  items: TimelineItem[];
  nextCursor?: string | null;
};

export interface ActivityRepoPort {
  findById(tenantId: string, activityId: string): Promise<ActivityEntity | null>;
  list(
    tenantId: string,
    filters: ListActivitiesFilters,
    pageSize?: number,
    cursor?: string
  ): Promise<ListActivitiesResult>;
  create(tenantId: string, activity: ActivityEntity): Promise<void>;
  update(tenantId: string, activity: ActivityEntity): Promise<void>;
  getTimeline(
    tenantId: string,
    entityType: "party" | "deal",
    entityId: string,
    pageSize?: number,
    cursor?: string
  ): Promise<TimelineResult>;
}

export const ACTIVITY_REPO_PORT = "crm/activity-repository";
