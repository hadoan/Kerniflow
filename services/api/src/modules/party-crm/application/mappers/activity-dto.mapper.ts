import type { ActivityDto } from "@kerniflow/contracts";
import type { ActivityEntity } from "../../domain/activity.entity";

export function toActivityDto(activity: ActivityEntity): ActivityDto {
  return {
    id: activity.id,
    tenantId: activity.tenantId,
    type: activity.type,
    subject: activity.subject,
    body: activity.body,
    partyId: activity.partyId,
    dealId: activity.dealId,
    dueAt: activity.dueAt ? activity.dueAt.toISOString() : null,
    completedAt: activity.completedAt ? activity.completedAt.toISOString() : null,
    status: activity.status,
    assignedToUserId: activity.assignedToUserId,
    createdByUserId: activity.createdByUserId,
    createdAt: activity.createdAt.toISOString(),
    updatedAt: activity.updatedAt.toISOString(),
  };
}
