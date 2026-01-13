import { z } from "zod";
import { ActivityDtoSchema, ActivityTypeSchema } from "./activity.types";
import { utcInstantSchema } from "../shared/local-date.schema";

export const CreateActivityInputSchema = z.object({
  type: ActivityTypeSchema,
  subject: z.string().min(1),
  body: z.string().optional(),
  partyId: z.string().optional(),
  dealId: z.string().optional(),
  dueAt: utcInstantSchema.optional(),
  assignedToUserId: z.string().optional(),
  channelKey: z.string().optional(),
  messageDirection: z.string().optional(),
  messageTo: z.string().optional(),
  openUrl: z.string().optional(),
});

export const CreateActivityOutputSchema = z.object({
  activity: ActivityDtoSchema,
});

export type CreateActivityInput = z.infer<typeof CreateActivityInputSchema>;
export type CreateActivityOutput = z.infer<typeof CreateActivityOutputSchema>;
