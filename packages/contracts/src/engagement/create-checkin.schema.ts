import { z } from "zod";
import { utcInstantSchema } from "../shared/local-date.schema";
import {
  CheckInByTypeSchema,
  CheckInEventSchema,
  CheckInStatusSchema,
} from "./checkin-event.types";

export const CreateCheckInEventInputSchema = z.object({
  checkInEventId: z.string().uuid(),
  customerPartyId: z.string().uuid(),
  registerId: z.string().uuid(),
  kioskDeviceId: z.string().optional().nullable(),
  checkedInAt: utcInstantSchema.optional(),
  checkedInByType: CheckInByTypeSchema,
  checkedInByEmployeePartyId: z.string().uuid().optional().nullable(),
  visitReason: z.string().max(500).optional().nullable(),
  assignedEmployeePartyId: z.string().uuid().optional().nullable(),
  tags: z.array(z.string()).optional(),
  posSaleId: z.string().uuid().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  overrideDuplicate: z.boolean().optional(),
});

export const CreateCheckInEventOutputSchema = z.object({
  checkInEvent: CheckInEventSchema,
  pointsAwarded: z.number().int().optional().nullable(),
});

export const DuplicateCheckInConflictSchema = z.object({
  code: z.literal("DUPLICATE_CHECKIN"),
  message: z.string(),
  previousCheckInEventId: z.string().uuid(),
  previousCheckedInAt: utcInstantSchema,
});

export type CreateCheckInEventInput = z.infer<typeof CreateCheckInEventInputSchema>;
export type CreateCheckInEventOutput = z.infer<typeof CreateCheckInEventOutputSchema>;
export type DuplicateCheckInConflict = z.infer<typeof DuplicateCheckInConflictSchema>;
