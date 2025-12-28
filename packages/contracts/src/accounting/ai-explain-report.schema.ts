import { z } from "zod";
import { ConfidenceLevelSchema, ReportTypeSchema } from "./enums";
import { ProvenanceSummarySchema } from "./ai-interaction.types";

export const ExplainReportInputSchema = z.object({
  reportType: ReportTypeSchema,
  reportParams: z.object({
    fromDate: z.string().optional(), // For trial balance, general ledger, P&L
    toDate: z.string().optional(),
    asOfDate: z.string().optional(), // For balance sheet
    accountId: z.string().optional(), // For general ledger
  }),
  focus: z
    .object({
      accountId: z.string().optional(),
      section: z.enum(["Income", "Expenses", "Assets", "Liabilities", "Equity"]).optional(),
      rowKey: z.string().optional(),
    })
    .optional(),
  compareTo: z
    .object({
      fromDate: z.string().optional(),
      toDate: z.string().optional(),
      asOfDate: z.string().optional(),
    })
    .optional(),
  userQuestion: z.string().optional(),
  idempotencyKey: z.string().optional(),
});

export type ExplainReportInput = z.infer<typeof ExplainReportInputSchema>;

export const ExplainReportOutputSchema = z.object({
  narrative: z.string(),
  keyDrivers: z.array(
    z.object({
      description: z.string(),
      accountId: z.string().optional(),
      accountCode: z.string().optional(),
      accountName: z.string().optional(),
      amountChangeCents: z.number().int().optional(),
      percentChange: z.number().optional(),
    })
  ),
  followUpActions: z.array(
    z.object({
      action: z.string(),
      linkTo: z.string().optional(), // Route or URL
    })
  ),
  confidence: ConfidenceLevelSchema,
  provenance: ProvenanceSummarySchema,
  aiInteractionId: z.string(),
});

export type ExplainReportOutput = z.infer<typeof ExplainReportOutputSchema>;
