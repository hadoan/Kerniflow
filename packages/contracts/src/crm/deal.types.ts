import { z } from "zod";
import { utcInstantSchema } from "../shared/local-date.schema";

export const DealStatusSchema = z.enum(["OPEN", "WON", "LOST"]);
export type DealStatus = z.infer<typeof DealStatusSchema>;

export const DealDtoSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  title: z.string(),
  partyId: z.string(),
  stageId: z.string(),
  amountCents: z.number().int().nullable(),
  currency: z.string(),
  expectedCloseDate: z.string().nullable(), // ISO date string (YYYY-MM-DD)
  probability: z.number().int().min(0).max(100).nullable(),
  status: DealStatusSchema,
  ownerUserId: z.string().nullable(),
  notes: z.string().nullable(),
  tags: z.array(z.string()),
  wonAt: utcInstantSchema.nullable(),
  lostAt: utcInstantSchema.nullable(),
  lostReason: z.string().nullable(),
  createdAt: utcInstantSchema,
  updatedAt: utcInstantSchema,
});

export type DealDto = z.infer<typeof DealDtoSchema>;
export type DealDTO = DealDto;
