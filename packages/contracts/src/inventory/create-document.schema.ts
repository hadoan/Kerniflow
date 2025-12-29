import { z } from "zod";
import { InventoryDocumentDtoSchema, InventoryDocumentTypeSchema } from "./inventory.types";
import { localDateSchema } from "../shared/local-date.schema";

export const InventoryDocumentLineInputSchema = z.object({
  id: z.string().optional(),
  productId: z.string(),
  quantity: z.number().positive(),
  unitCostCents: z.number().int().nonnegative().optional(),
  fromLocationId: z.string().optional(),
  toLocationId: z.string().optional(),
  notes: z.string().optional(),
});

export const CreateInventoryDocumentInputSchema = z.object({
  documentType: InventoryDocumentTypeSchema,
  partyId: z.string().optional(),
  reference: z.string().optional(),
  scheduledDate: localDateSchema.optional(),
  postingDate: localDateSchema.optional(),
  notes: z.string().optional(),
  sourceType: z.string().optional(),
  sourceId: z.string().optional(),
  lineItems: z.array(InventoryDocumentLineInputSchema).min(1),
  idempotencyKey: z.string().optional(),
});

export const CreateInventoryDocumentOutputSchema = z.object({
  document: InventoryDocumentDtoSchema,
});

export type InventoryDocumentLineInput = z.infer<typeof InventoryDocumentLineInputSchema>;
export type CreateInventoryDocumentInput = z.infer<typeof CreateInventoryDocumentInputSchema>;
export type CreateInventoryDocumentOutput = z.infer<typeof CreateInventoryDocumentOutputSchema>;
