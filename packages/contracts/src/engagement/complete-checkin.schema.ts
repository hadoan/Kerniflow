import { z } from "zod";
import { CheckInEventSchema } from "./checkin-event.types";

export const CompleteCheckInEventInputSchema = z.object({
  checkInEventId: z.string().uuid(),
});

export const CompleteCheckInEventOutputSchema = z.object({
  checkInEvent: CheckInEventSchema,
});

export type CompleteCheckInEventInput = z.infer<typeof CompleteCheckInEventInputSchema>;
export type CompleteCheckInEventOutput = z.infer<typeof CompleteCheckInEventOutputSchema>;
