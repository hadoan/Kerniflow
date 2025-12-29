import { z } from "zod";
import { TimelineItemSchema } from "./activity.types";

export const GetTimelineInputSchema = z.object({
  entityType: z.enum(["party", "deal"]),
  entityId: z.string(),
  cursor: z.string().optional(),
  limit: z.number().int().positive().max(100).default(50),
});

export const GetTimelineOutputSchema = z.object({
  items: z.array(TimelineItemSchema),
  nextCursor: z.string().nullable().optional(),
});

export type GetTimelineInput = z.infer<typeof GetTimelineInputSchema>;
export type GetTimelineOutput = z.infer<typeof GetTimelineOutputSchema>;
