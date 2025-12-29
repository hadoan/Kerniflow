import { z } from "zod";
import { ReorderPolicyDtoSchema } from "./inventory.types";

export const UpdateReorderPolicyPatchSchema = z.object({
  minQty: z.number().nonnegative().optional(),
  maxQty: z.number().nonnegative().nullable().optional(),
  reorderPoint: z.number().nonnegative().nullable().optional(),
  preferredSupplierPartyId: z.string().nullable().optional(),
  leadTimeDays: z.number().int().nonnegative().nullable().optional(),
  isActive: z.boolean().optional(),
});

export const UpdateReorderPolicyInputSchema = z.object({
  reorderPolicyId: z.string(),
  patch: UpdateReorderPolicyPatchSchema,
});

export const UpdateReorderPolicyOutputSchema = z.object({
  policy: ReorderPolicyDtoSchema,
});

export type UpdateReorderPolicyPatch = z.infer<typeof UpdateReorderPolicyPatchSchema>;
export type UpdateReorderPolicyInput = z.infer<typeof UpdateReorderPolicyInputSchema>;
export type UpdateReorderPolicyOutput = z.infer<typeof UpdateReorderPolicyOutputSchema>;
