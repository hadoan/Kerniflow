import { z } from "zod";
import { MonthKeySchema } from "./schema";

export const MonthlyCashReportWarningSchema = z.object({
  code: z.enum([
    "MISSING_CASH_DAY",
    "BALANCE_MISMATCH",
    "BALANCE_CONTINUITY_MISMATCH",
    "NEGATIVE_CASH",
    "NO_CLOSED_CASH_DAYS",
    "REGISTER_ACTIVE_PERIOD_UNKNOWN",
  ]),
  severity: z.enum(["warning", "error", "blocking"]),
  message: z.string().optional(),
  date: z.string().optional(),
  previousDate: z.string().optional(),
  expectedOpeningCashCents: z.number().optional(),
  actualOpeningCashCents: z.number().optional(),
});
export type MonthlyCashReportWarning = z.infer<typeof MonthlyCashReportWarningSchema>;

export const MonthlyCashReportDayRowSchema = z.object({
  date: z.string(),
  status: z.enum(["CLOSED", "MISSING", "DISCREPANCY"]),
  openingCashCents: z.number().int().nullable(),
  cashSalesCents: z.number().int(),
  cashInflowsCents: z.number().int(),
  cashOutflowsCents: z.number().int(),
  calculatedClosingCashCents: z.number().int().nullable(),
  actualClosingCashCents: z.number().int().nullable(),
  discrepancyCents: z.number().int().nullable(),
  cashDayCloseId: z.string().optional(),
});
export type MonthlyCashReportDayRow = z.infer<typeof MonthlyCashReportDayRowSchema>;

export const MonthlyCashReportTotalsSchema = z.object({
  cashSalesCents: z.number().int(),
  goodsPurchasesCents: z.number().int(),
  businessExpensesCents: z.number().int(),
  privateWithdrawalsCents: z.number().int(),
  privateDepositsCents: z.number().int(),
  bankDepositsCents: z.number().int(),
  bankWithdrawalsToCashCents: z.number().int(),
  otherCashOutflowsCents: z.number().int(),
  otherNonSalesCashInflowsCents: z.number().int(),
});
export type MonthlyCashReportTotals = z.infer<typeof MonthlyCashReportTotalsSchema>;

export const MonthlyCoverageStatusSchema = z.enum([
  "KNOWN",
  "NOT_ACTIVE",
  "ACTIVE_PERIOD_UNKNOWN",
  "INCOMPLETE_CONFIGURATION",
]);
export type MonthlyCoverageStatus = z.infer<typeof MonthlyCoverageStatusSchema>;

export const MonthlyCashReportCoverageSchema = z.object({
  status: MonthlyCoverageStatusSchema,
  missingDayCount: z.number().int().nullable(),
  expectedFrom: z.string().optional(),
  expectedTo: z.string().optional(),
  evaluatedDayCount: z.number().int().optional(),
});
export type MonthlyCashReportCoverage = z.infer<typeof MonthlyCashReportCoverageSchema>;

export const MonthlyCashReportDtoSchema = z.object({
  registerId: z.string(),
  year: z.number().int(),
  month: z.number().int(),
  periodStart: z.string(),
  periodEnd: z.string(),

  openingCashCents: z.number().int().nullable(),
  closingCashCents: z.number().int().nullable(),

  totals: MonthlyCashReportTotalsSchema,
  days: z.array(MonthlyCashReportDayRowSchema),
  warnings: z.array(MonthlyCashReportWarningSchema),
  coverage: MonthlyCashReportCoverageSchema,

  closedDayCount: z.number().int(),
  discrepancyDayCount: z.number().int(),

  isComplete: z.boolean(),
  generatedAt: z.string().datetime(),
});
export type MonthlyCashReportDto = z.infer<typeof MonthlyCashReportDtoSchema>;

export const GetMonthlyCashReportQuerySchema = z.object({
  registerId: z.string(),
  year: z.number().int(),
  month: z.number().int().min(1).max(12),
});
export type GetMonthlyCashReportQuery = z.infer<typeof GetMonthlyCashReportQuerySchema>;
