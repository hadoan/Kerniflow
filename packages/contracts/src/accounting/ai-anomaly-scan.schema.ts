import { z } from "zod";
import { ConfidenceLevelSchema } from "./enums";
import { ProvenanceSummarySchema } from "./ai-interaction.types";

export const AnomalyScanInputSchema = z.object({
  fromDate: z.string(), // LocalDate YYYY-MM-DD
  toDate: z.string(), // LocalDate YYYY-MM-DD
  accountId: z.string().optional(),
  sensitivity: z.enum(["low", "medium", "high"]).default("medium"),
  idempotencyKey: z.string().optional(),
});

export type AnomalyScanInput = z.infer<typeof AnomalyScanInputSchema>;

export const AnomalyTypeSchema = z.enum([
  "OutlierAmount",
  "UnusualAccountUsage",
  "DuplicateMemo",
  "WeekendPosting",
  "NegativeBalanceRisk",
  "SuspiciousPattern",
  "UnbalancedEntry",
]);

export type AnomalyType = z.infer<typeof AnomalyTypeSchema>;

export const AnomalyDtoSchema = z.object({
  id: z.string(),
  type: AnomalyTypeSchema,
  severity: z.enum(["info", "warn", "high"]),
  description: z.string(),
  rationale: z.string(),
  journalEntryId: z.string().optional(),
  accountId: z.string().optional(),
  linkTo: z.string().optional(), // Route or URL
  confidence: ConfidenceLevelSchema,
});

export type AnomalyDto = z.infer<typeof AnomalyDtoSchema>;

export const AnomalyScanOutputSchema = z.object({
  anomalies: z.array(AnomalyDtoSchema),
  summary: z.string(),
  provenance: ProvenanceSummarySchema,
  aiInteractionId: z.string(),
});

export type AnomalyScanOutput = z.infer<typeof AnomalyScanOutputSchema>;
