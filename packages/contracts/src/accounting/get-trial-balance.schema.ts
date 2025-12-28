import { z } from "zod";
import { TrialBalanceDtoSchema } from "./reports.types";

export const GetTrialBalanceInputSchema = z.object({
  fromDate: z.string(), // LocalDate YYYY-MM-DD
  toDate: z.string(), // LocalDate YYYY-MM-DD
});

export type GetTrialBalanceInput = z.infer<typeof GetTrialBalanceInputSchema>;

export const GetTrialBalanceOutputSchema = z.object({
  trialBalance: TrialBalanceDtoSchema,
});

export type GetTrialBalanceOutput = z.infer<typeof GetTrialBalanceOutputSchema>;
