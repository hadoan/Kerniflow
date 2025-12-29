import { z } from "zod";
import { ProductTypeSchema } from "../inventory/inventory.types";
import { ProvenanceSchema } from "../crm/ai-proposals/party-proposal.types";

export const ProductProposalDuplicateSchema = z.object({
  productId: z.string().optional(),
  sku: z.string().optional(),
  name: z.string().optional(),
  reason: z.string().optional(),
});

export const ProductProposalSchema = z.object({
  sku: z.string().optional(),
  name: z.string(),
  productType: ProductTypeSchema,
  unitOfMeasure: z.string(),
  barcode: z.string().optional(),
  defaultSalesPriceCents: z.number().int().nonnegative().optional(),
  defaultPurchaseCostCents: z.number().int().nonnegative().optional(),
  tags: z.array(z.string()).optional(),
  duplicates: z.array(ProductProposalDuplicateSchema).optional(),
  missingFields: z.array(z.string()).optional(),
  followUpQuestions: z.array(z.string()).optional(),
});

export const ProductProposalCardSchema = z.object({
  ok: z.literal(true),
  proposal: ProductProposalSchema,
  confidence: z.number().min(0).max(1),
  rationale: z.string(),
  provenance: ProvenanceSchema,
});

export type ProductProposalCard = z.infer<typeof ProductProposalCardSchema>;
