import { z } from "zod";
import { ActivityDtoSchema } from "./activity.types";

export const CompleteActivityInputSchema = z.object({
  activityId: z.string(),
});

export const CompleteActivityOutputSchema = z.object({
  activity: ActivityDtoSchema,
});

export type CompleteActivityInput = z.infer<typeof CompleteActivityInputSchema>;
export type CompleteActivityOutput = z.infer<typeof CompleteActivityOutputSchema>;
