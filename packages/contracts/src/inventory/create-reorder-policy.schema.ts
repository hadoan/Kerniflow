import { z } from "zod";
import { ReorderPolicyDtoSchema } from "./inventory.types";

export const CreateReorderPolicyInputSchema = z.object({
  productId: z.string(),
  warehouseId: z.string(),
  minQty: z.number().nonnegative(),
  maxQty: z.number().nonnegative().optional(),
  reorderPoint: z.number().nonnegative().optional(),
  preferredSupplierPartyId: z.string().optional(),
  leadTimeDays: z.number().int().nonnegative().optional(),
  isActive: z.boolean().optional(),
  idempotencyKey: z.string().optional(),
});

export const CreateReorderPolicyOutputSchema = z.object({
  policy: ReorderPolicyDtoSchema,
});

export type CreateReorderPolicyInput = z.infer<typeof CreateReorderPolicyInputSchema>;
export type CreateReorderPolicyOutput = z.infer<typeof CreateReorderPolicyOutputSchema>;
