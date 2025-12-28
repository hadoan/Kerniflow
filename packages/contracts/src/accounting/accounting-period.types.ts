import { z } from "zod";
import { PeriodStatusSchema } from "./enums";

export const AccountingPeriodDtoSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  fiscalYearId: z.string(),
  name: z.string(),
  startDate: z.string(), // LocalDate YYYY-MM-DD
  endDate: z.string(), // LocalDate YYYY-MM-DD
  status: PeriodStatusSchema,
  closedAt: z.string().nullable(),
  closedBy: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type AccountingPeriodDto = z.infer<typeof AccountingPeriodDtoSchema>;
