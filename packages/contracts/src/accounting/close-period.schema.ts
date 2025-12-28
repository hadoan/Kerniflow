import { z } from "zod";
import { AccountingPeriodDtoSchema } from "./accounting-period.types";

export const ClosePeriodInputSchema = z.object({
  periodId: z.string(),
  confirmation: z.literal(true),
  idempotencyKey: z.string().optional(),
});

export type ClosePeriodInput = z.infer<typeof ClosePeriodInputSchema>;

export const ClosePeriodOutputSchema = z.object({
  period: AccountingPeriodDtoSchema,
});

export type ClosePeriodOutput = z.infer<typeof ClosePeriodOutputSchema>;
