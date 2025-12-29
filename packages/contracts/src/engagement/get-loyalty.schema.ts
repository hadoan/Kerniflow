import { z } from "zod";
import { LoyaltyAccountSchema } from "./loyalty-account.types";

export const GetLoyaltySummaryInputSchema = z.object({
  customerPartyId: z.string().uuid(),
});

export const GetLoyaltySummaryOutputSchema = z.object({
  account: LoyaltyAccountSchema,
});

export type GetLoyaltySummaryInput = z.infer<typeof GetLoyaltySummaryInputSchema>;
export type GetLoyaltySummaryOutput = z.infer<typeof GetLoyaltySummaryOutputSchema>;
