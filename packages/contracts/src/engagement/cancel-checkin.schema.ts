import { z } from "zod";
import { CheckInEventSchema } from "./checkin-event.types";

export const CancelCheckInEventInputSchema = z.object({
  checkInEventId: z.string().uuid(),
  reason: z.string().max(500).optional().nullable(),
});

export const CancelCheckInEventOutputSchema = z.object({
  checkInEvent: CheckInEventSchema,
});

export type CancelCheckInEventInput = z.infer<typeof CancelCheckInEventInputSchema>;
export type CancelCheckInEventOutput = z.infer<typeof CancelCheckInEventOutputSchema>;
