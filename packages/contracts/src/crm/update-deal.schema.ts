import { z } from "zod";
import { DealDtoSchema } from "./deal.types";

export const UpdateDealInputSchema = z
  .object({
    dealId: z.string(),
    title: z.string().min(1).optional(),
    partyId: z.string().optional(),
    amountCents: z.number().int().optional(),
    currency: z.string().optional(),
    expectedCloseDate: z.string().optional(),
    probability: z.number().int().min(0).max(100).optional(),
    ownerUserId: z.string().optional(),
    notes: z.string().optional(),
    tags: z.array(z.string()).optional(),
  })
  .refine((val) => Object.keys(val).length > 1, {
    message: "At least one field besides dealId must be provided",
  });

export const UpdateDealOutputSchema = z.object({
  deal: DealDtoSchema,
});

export type UpdateDealInput = z.infer<typeof UpdateDealInputSchema>;
export type UpdateDealOutput = z.infer<typeof UpdateDealOutputSchema>;
