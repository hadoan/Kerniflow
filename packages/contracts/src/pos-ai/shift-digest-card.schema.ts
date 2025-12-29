import { z } from "zod";

/**
 * Anomaly detected during shift
 */
export const ShiftAnomalySchema = z.object({
  type: z.string(),
  severity: z.enum(["INFO", "WARNING", "CRITICAL"]),
  details: z.string(),
  affectedSales: z.array(z.string().uuid()).optional(),
});

export type ShiftAnomaly = z.infer<typeof ShiftAnomalySchema>;

/**
 * Top product sold during shift
 */
export const TopProductSchema = z.object({
  productId: z.string().uuid(),
  productName: z.string(),
  sku: z.string(),
  quantitySold: z.number().int().nonnegative(),
  revenueCents: z.number().int().nonnegative(),
});

export type TopProduct = z.infer<typeof TopProductSchema>;

/**
 * Shift digest card - returned by pos_shiftDigest AI tool
 */
export const ShiftDigestCardSchema = z.object({
  ok: z.boolean(),
  summary: z.object({
    totalSales: z.number().int().nonnegative(),
    totalRevenueCents: z.number().int().nonnegative(),
    averageSaleCents: z.number().int().nonnegative(),
    topProducts: z.array(TopProductSchema),
    paymentMethodBreakdown: z.record(z.string(), z.number().int().nonnegative()),
    anomalies: z.array(ShiftAnomalySchema),
  }),
  confidence: z.number().min(0).max(1),
  rationale: z.string(),
  provenance: z.object({
    sessionId: z.string().uuid(),
    salesAnalyzed: z.number().int().nonnegative(),
    timeRange: z.object({
      from: z.coerce.date(),
      to: z.coerce.date(),
    }),
  }),
});

export type ShiftDigestCard = z.infer<typeof ShiftDigestCardSchema>;

/**
 * Tool input: pos_shiftDigest
 */
export const PosShiftDigestInputSchema = z.object({
  sessionId: z.string().uuid(),
  includeAnomalyDetection: z.boolean().default(true),
  topProductsLimit: z.number().int().positive().max(10).default(5),
});

export type PosShiftDigestInput = z.infer<typeof PosShiftDigestInputSchema>;
