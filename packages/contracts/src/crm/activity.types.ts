import { z } from "zod";
import { utcInstantSchema } from "../shared/local-date.schema";

export const ActivityTypeSchema = z.enum(["NOTE", "TASK", "CALL", "MEETING", "EMAIL_DRAFT"]);
export type ActivityType = z.infer<typeof ActivityTypeSchema>;

export const ActivityStatusSchema = z.enum(["OPEN", "COMPLETED", "CANCELED"]);
export type ActivityStatus = z.infer<typeof ActivityStatusSchema>;

export const ActivityDtoSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  type: ActivityTypeSchema,
  subject: z.string(),
  body: z.string().nullable(),
  partyId: z.string().nullable(),
  dealId: z.string().nullable(),
  dueAt: utcInstantSchema.nullable(),
  completedAt: utcInstantSchema.nullable(),
  status: ActivityStatusSchema,
  assignedToUserId: z.string().nullable(),
  createdByUserId: z.string().nullable(),
  createdAt: utcInstantSchema,
  updatedAt: utcInstantSchema,
});

export type ActivityDto = z.infer<typeof ActivityDtoSchema>;
export type ActivityDTO = ActivityDto;

// Timeline item union type (can be Activity or other timeline events like stage transitions)
export const TimelineItemTypeSchema = z.enum(["ACTIVITY", "STAGE_TRANSITION", "NOTE"]);
export type TimelineItemType = z.infer<typeof TimelineItemTypeSchema>;

export const TimelineItemSchema = z.object({
  id: z.string(),
  type: TimelineItemTypeSchema,
  timestamp: utcInstantSchema,
  subject: z.string(),
  body: z.string().nullable(),
  actorUserId: z.string().nullable(),
  metadata: z.record(z.unknown()).optional(), // flexible for different timeline item types
});

export type TimelineItem = z.infer<typeof TimelineItemSchema>;
