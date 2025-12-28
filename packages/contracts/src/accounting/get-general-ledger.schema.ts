import { z } from "zod";
import { GeneralLedgerDtoSchema } from "./reports.types";

export const GetGeneralLedgerInputSchema = z.object({
  accountId: z.string(),
  fromDate: z.string(), // LocalDate YYYY-MM-DD
  toDate: z.string(), // LocalDate YYYY-MM-DD
});

export type GetGeneralLedgerInput = z.infer<typeof GetGeneralLedgerInputSchema>;

export const GetGeneralLedgerOutputSchema = z.object({
  generalLedger: GeneralLedgerDtoSchema,
});

export type GetGeneralLedgerOutput = z.infer<typeof GetGeneralLedgerOutputSchema>;
