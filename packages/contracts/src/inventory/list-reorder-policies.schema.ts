import { z } from "zod";
import { ReorderPolicyDtoSchema } from "./inventory.types";

export const ListReorderPoliciesInputSchema = z.object({
  productId: z.string().optional(),
  warehouseId: z.string().optional(),
});

export const ListReorderPoliciesOutputSchema = z.object({
  items: z.array(ReorderPolicyDtoSchema),
});

export type ListReorderPoliciesInput = z.infer<typeof ListReorderPoliciesInputSchema>;
export type ListReorderPoliciesOutput = z.infer<typeof ListReorderPoliciesOutputSchema>;
