import { z } from "zod";
import { AccountingPeriodDtoSchema } from "./accounting-period.types";

export const ReopenPeriodInputSchema = z.object({
  periodId: z.string(),
  confirmation: z.literal(true),
  reason: z.string().min(10).max(500),
  idempotencyKey: z.string().optional(),
});

export type ReopenPeriodInput = z.infer<typeof ReopenPeriodInputSchema>;

export const ReopenPeriodOutputSchema = z.object({
  period: AccountingPeriodDtoSchema,
});

export type ReopenPeriodOutput = z.infer<typeof ReopenPeriodOutputSchema>;
