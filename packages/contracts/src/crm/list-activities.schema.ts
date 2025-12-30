import { z } from "zod";
import { ActivityDtoSchema, ActivityStatusSchema, ActivityTypeSchema } from "./activity.types";

export const ListActivitiesInputSchema = z.object({
  partyId: z.string().optional(),
  dealId: z.string().optional(),
  type: ActivityTypeSchema.optional(),
  status: ActivityStatusSchema.optional(),
  assignedToUserId: z.string().optional(),
  cursor: z.string().optional(),
  limit: z.number().int().positive().max(100).optional(),
});

export const ListActivitiesOutputSchema = z.object({
  items: z.array(ActivityDtoSchema),
  nextCursor: z.string().nullable().optional(),
});

export type ListActivitiesInput = z.infer<typeof ListActivitiesInputSchema>;
export type ListActivitiesOutput = z.infer<typeof ListActivitiesOutputSchema>;
