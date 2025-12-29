import { z } from "zod";
import {
  InventoryDocumentDtoSchema,
  InventoryDocumentStatusSchema,
  InventoryDocumentTypeSchema,
} from "./inventory.types";
import { localDateSchema } from "../shared/local-date.schema";

export const ListInventoryDocumentsInputSchema = z.object({
  type: InventoryDocumentTypeSchema.optional(),
  status: InventoryDocumentStatusSchema.optional(),
  partyId: z.string().optional(),
  fromDate: localDateSchema.optional(),
  toDate: localDateSchema.optional(),
  search: z.string().optional(),
  cursor: z.string().optional(),
  pageSize: z.number().int().positive().max(100).optional(),
});

export const ListInventoryDocumentsOutputSchema = z.object({
  items: z.array(InventoryDocumentDtoSchema),
  nextCursor: z.string().nullable().optional(),
});

export type ListInventoryDocumentsInput = z.infer<typeof ListInventoryDocumentsInputSchema>;
export type ListInventoryDocumentsOutput = z.infer<typeof ListInventoryDocumentsOutputSchema>;
