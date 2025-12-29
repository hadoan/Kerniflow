import { z } from "zod";
import { utcInstantSchema } from "../shared/local-date.schema";

export const CheckInStatusSchema = z.enum(["ACTIVE", "COMPLETED", "CANCELED"]);
export type CheckInStatus = z.infer<typeof CheckInStatusSchema>;

export const CheckInByTypeSchema = z.enum(["SELF_SERVICE", "EMPLOYEE"]);
export type CheckInByType = z.infer<typeof CheckInByTypeSchema>;

export const CheckInEventSchema = z.object({
  tenantId: z.string(),
  checkInEventId: z.string().uuid(),
  customerPartyId: z.string().uuid(),
  registerId: z.string().uuid(),
  kioskDeviceId: z.string().optional().nullable(),
  checkedInAt: utcInstantSchema,
  checkedInByType: CheckInByTypeSchema,
  checkedInByEmployeePartyId: z.string().uuid().optional().nullable(),
  status: CheckInStatusSchema,
  visitReason: z.string().max(500).optional().nullable(),
  assignedEmployeePartyId: z.string().uuid().optional().nullable(),
  tags: z.array(z.string()).optional(),
  posSaleId: z.string().uuid().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  createdAt: utcInstantSchema,
  updatedAt: utcInstantSchema,
});

export type CheckInEvent = z.infer<typeof CheckInEventSchema>;
