import { Injectable } from "@nestjs/common";
import { PrismaService } from "@corely/data";
import { ActivityEntity } from "../../domain/activity.entity";
import type {
  ActivityRepoPort,
  ListActivitiesFilters,
  ListActivitiesResult,
  TimelineItem,
  TimelineResult,
} from "../../application/ports/activity-repository.port";

type ActivityRow = {
  id: string;
  tenantId: string;
  type: "NOTE" | "TASK" | "CALL" | "MEETING" | "EMAIL_DRAFT";
  subject: string;
  body: string | null;
  partyId: string | null;
  dealId: string | null;
  dueAt: Date | null;
  completedAt: Date | null;
  status: "OPEN" | "COMPLETED" | "CANCELED";
  assignedToUserId: string | null;
  createdByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

const toEntity = (row: ActivityRow): ActivityEntity => {
  return new ActivityEntity({
    id: row.id,
    tenantId: row.tenantId,
    type: row.type,
    subject: row.subject,
    body: row.body,
    partyId: row.partyId,
    dealId: row.dealId,
    dueAt: row.dueAt,
    completedAt: row.completedAt,
    status: row.status,
    assignedToUserId: row.assignedToUserId,
    createdByUserId: row.createdByUserId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
};

@Injectable()
export class PrismaActivityRepoAdapter implements ActivityRepoPort {
  constructor(private readonly prisma: PrismaService) {}

  async findById(tenantId: string, activityId: string): Promise<ActivityEntity | null> {
    const row = await this.prisma.activity.findFirst({
      where: { id: activityId, tenantId },
    });

    if (!row) {
      return null;
    }

    return toEntity(row as ActivityRow);
  }

  async list(
    tenantId: string,
    filters: ListActivitiesFilters,
    pageSize = 20,
    cursor?: string
  ): Promise<ListActivitiesResult> {
    const where = {
      tenantId,
      ...(filters.partyId ? { partyId: filters.partyId } : {}),
      ...(filters.dealId ? { dealId: filters.dealId } : {}),
      ...(filters.type ? { type: filters.type } : {}),
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.assignedToUserId ? { assignedToUserId: filters.assignedToUserId } : {}),
    };

    const results = await this.prisma.activity.findMany({
      where,
      take: pageSize,
      skip: cursor ? 1 : 0,
      ...(cursor ? { cursor: { id: cursor } } : {}),
      orderBy: { createdAt: "desc" },
    });

    const items = results.map((row) => toEntity(row as ActivityRow));
    const nextCursor = items.length === pageSize ? (items.at(-1)?.id ?? null) : null;

    return { items, nextCursor };
  }

  async create(tenantId: string, activity: ActivityEntity): Promise<void> {
    if (tenantId !== activity.tenantId) {
      throw new Error("Tenant mismatch when creating activity");
    }

    await this.prisma.activity.create({
      data: {
        id: activity.id,
        tenantId: activity.tenantId,
        type: activity.type,
        subject: activity.subject,
        body: activity.body,
        partyId: activity.partyId,
        dealId: activity.dealId,
        dueAt: activity.dueAt,
        completedAt: activity.completedAt,
        status: activity.status,
        assignedToUserId: activity.assignedToUserId,
        createdByUserId: activity.createdByUserId,
        createdAt: activity.createdAt,
        updatedAt: activity.updatedAt,
      },
    });
  }

  async update(tenantId: string, activity: ActivityEntity): Promise<void> {
    if (tenantId !== activity.tenantId) {
      throw new Error("Tenant mismatch when updating activity");
    }

    await this.prisma.activity.update({
      where: { id: activity.id },
      data: {
        type: activity.type,
        subject: activity.subject,
        body: activity.body,
        partyId: activity.partyId,
        dealId: activity.dealId,
        dueAt: activity.dueAt,
        completedAt: activity.completedAt,
        status: activity.status,
        assignedToUserId: activity.assignedToUserId,
        updatedAt: activity.updatedAt,
      },
    });
  }

  async getTimeline(
    tenantId: string,
    entityType: "party" | "deal",
    entityId: string,
    pageSize = 100,
    cursor?: string
  ): Promise<TimelineResult> {
    // Fetch activities for the entity
    const activities = await this.prisma.activity.findMany({
      where: {
        tenantId,
        ...(entityType === "party" ? { partyId: entityId } : { dealId: entityId }),
      },
      orderBy: { createdAt: "desc" },
      take: pageSize,
    });

    const activityItems: TimelineItem[] = activities.map((activity) => ({
      id: activity.id,
      type: "ACTIVITY" as const,
      timestamp: activity.createdAt,
      subject: activity.subject,
      body: activity.body,
      actorUserId: activity.createdByUserId,
      metadata: {
        activityType: activity.type,
        activityStatus: activity.status,
        assignedToUserId: activity.assignedToUserId,
        dueAt: activity.dueAt?.toISOString() ?? null,
        completedAt: activity.completedAt?.toISOString() ?? null,
      },
    }));

    // If entity is a deal, also fetch stage transitions
    let stageTransitionItems: TimelineItem[] = [];
    if (entityType === "deal") {
      const transitions = await this.prisma.dealStageTransition.findMany({
        where: { tenantId, dealId: entityId },
        orderBy: { transitionedAt: "desc" },
        take: pageSize,
      });

      stageTransitionItems = transitions.map((transition) => ({
        id: transition.id,
        type: "STAGE_TRANSITION" as const,
        timestamp: transition.transitionedAt,
        subject: `Moved from ${transition.fromStageId ?? "new"} to ${transition.toStageId}`,
        body: null,
        actorUserId: transition.transitionedByUserId,
        metadata: {
          fromStageId: transition.fromStageId,
          toStageId: transition.toStageId,
        },
      }));
    }

    // Merge and sort all timeline items by timestamp (descending)
    const allItems = [...activityItems, ...stageTransitionItems].sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
    );

    // Apply pagination
    const items = allItems.slice(0, pageSize);
    const nextCursor = items.length === pageSize ? (items.at(-1)?.id ?? null) : null;

    return { items, nextCursor };
  }
}
