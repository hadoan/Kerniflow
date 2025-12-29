import { z } from "zod";
import { DealDtoSchema, DealStatusSchema } from "./deal.types";

export const ListDealsInputSchema = z.object({
  partyId: z.string().optional(),
  stageId: z.string().optional(),
  status: DealStatusSchema.optional(),
  ownerUserId: z.string().optional(),
  cursor: z.string().optional(),
  limit: z.number().int().positive().max(100).optional(),
});

export const ListDealsOutputSchema = z.object({
  items: z.array(DealDtoSchema),
  nextCursor: z.string().nullable().optional(),
});

export type ListDealsInput = z.infer<typeof ListDealsInputSchema>;
export type ListDealsOutput = z.infer<typeof ListDealsOutputSchema>;
