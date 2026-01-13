import { z } from "zod";
import { ActivityDtoSchema } from "./activity.types";
import { utcInstantSchema } from "../shared/local-date.schema";

export const LogMessageInputSchema = z.object({
  dealId: z.string(),
  channelKey: z.string(),
  direction: z.enum(["outbound", "inbound"]).default("outbound"),
  subject: z.string().optional(),
  body: z.string().optional(),
  to: z.string().optional(),
  openUrl: z.string().optional(),
  templateId: z.string().optional(),
  occurredAt: utcInstantSchema.optional(),
});

export const LogMessageOutputSchema = z.object({
  activity: ActivityDtoSchema,
});

export type LogMessageInput = z.infer<typeof LogMessageInputSchema>;
export type LogMessageOutput = z.infer<typeof LogMessageOutputSchema>;
