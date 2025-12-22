import { z } from "zod";
import {
  TaxSourceTypeSchema,
  CustomerTaxInfoSchema,
  TaxLineInputSchema,
  TaxSnapshotDtoSchema,
} from "./tax.types";

/**
 * Lock Tax Snapshot Input
 * Creates an immutable tax calculation for a finalized document
 * MUST be idempotent based on (tenantId, sourceType, sourceId)
 */
export const LockTaxSnapshotInputSchema = z.object({
  sourceType: TaxSourceTypeSchema,
  sourceId: z.string(),
  jurisdiction: z.string().default("DE"),
  documentDate: z.string().datetime(),
  currency: z.string().default("EUR"),
  customer: CustomerTaxInfoSchema.optional().nullable(),
  lines: z.array(TaxLineInputSchema).min(1),
  idempotencyKey: z.string().optional(),
});

export const LockTaxSnapshotOutputSchema = z.object({
  snapshot: TaxSnapshotDtoSchema,
});

export type LockTaxSnapshotInput = z.infer<typeof LockTaxSnapshotInputSchema>;
export type LockTaxSnapshotOutput = z.infer<typeof LockTaxSnapshotOutputSchema>;
