import { z } from "zod";
import { CheckInEventSchema, CheckInStatusSchema } from "./checkin-event.types";

export const ListCheckInEventsInputSchema = z.object({
  customerPartyId: z.string().uuid().optional(),
  registerId: z.string().uuid().optional(),
  status: CheckInStatusSchema.optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  cursor: z.string().optional(),
  pageSize: z.number().int().positive().max(200).optional(),
});

export const ListCheckInEventsOutputSchema = z.object({
  items: z.array(CheckInEventSchema),
  nextCursor: z.string().nullable().optional(),
});

export type ListCheckInEventsInput = z.infer<typeof ListCheckInEventsInputSchema>;
export type ListCheckInEventsOutput = z.infer<typeof ListCheckInEventsOutputSchema>;
