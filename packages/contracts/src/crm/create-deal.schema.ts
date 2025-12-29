import { z } from "zod";
import { DealDtoSchema } from "./deal.types";

export const CreateDealInputSchema = z.object({
  title: z.string().min(1),
  partyId: z.string(),
  stageId: z.string().default("lead"),
  amountCents: z.number().int().optional(),
  currency: z.string().default("EUR"),
  expectedCloseDate: z.string().optional(), // ISO date string (YYYY-MM-DD)
  probability: z.number().int().min(0).max(100).optional(),
  ownerUserId: z.string().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export const CreateDealOutputSchema = z.object({
  deal: DealDtoSchema,
});

export type CreateDealInput = z.infer<typeof CreateDealInputSchema>;
export type CreateDealOutput = z.infer<typeof CreateDealOutputSchema>;
