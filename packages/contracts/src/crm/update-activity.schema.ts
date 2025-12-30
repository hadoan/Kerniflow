import { z } from "zod";
import { ActivityDtoSchema } from "./activity.types";
import { utcInstantSchema } from "../shared/local-date.schema";

export const UpdateActivityInputSchema = z
  .object({
    activityId: z.string(),
    subject: z.string().min(1).optional(),
    body: z.string().optional(),
    dueAt: utcInstantSchema.optional(),
    assignedToUserId: z.string().nullable().optional(),
  })
  .refine((val) => Object.keys(val).length > 1, {
    message: "At least one field besides activityId must be provided",
  });

export const UpdateActivityOutputSchema = z.object({
  activity: ActivityDtoSchema,
});

export type UpdateActivityInput = z.infer<typeof UpdateActivityInputSchema>;
export type UpdateActivityOutput = z.infer<typeof UpdateActivityOutputSchema>;
