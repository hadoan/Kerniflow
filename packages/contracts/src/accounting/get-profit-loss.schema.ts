import { z } from "zod";
import { ProfitLossDtoSchema } from "./reports.types";

export const GetProfitLossInputSchema = z.object({
  fromDate: z.string(), // LocalDate YYYY-MM-DD
  toDate: z.string(), // LocalDate YYYY-MM-DD
});

export type GetProfitLossInput = z.infer<typeof GetProfitLossInputSchema>;

export const GetProfitLossOutputSchema = z.object({
  profitLoss: ProfitLossDtoSchema,
});

export type GetProfitLossOutput = z.infer<typeof GetProfitLossOutputSchema>;
