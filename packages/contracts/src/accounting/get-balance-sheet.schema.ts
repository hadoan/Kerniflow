import { z } from "zod";
import { BalanceSheetDtoSchema } from "./reports.types";

export const GetBalanceSheetInputSchema = z.object({
  asOfDate: z.string(), // LocalDate YYYY-MM-DD
});

export type GetBalanceSheetInput = z.infer<typeof GetBalanceSheetInputSchema>;

export const GetBalanceSheetOutputSchema = z.object({
  balanceSheet: BalanceSheetDtoSchema,
});

export type GetBalanceSheetOutput = z.infer<typeof GetBalanceSheetOutputSchema>;
