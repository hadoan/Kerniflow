import { z } from "zod";
import { ReorderSuggestionDtoSchema } from "./inventory.types";
import { localDateSchema } from "../shared/local-date.schema";

export const GetReorderSuggestionsInputSchema = z.object({
  warehouseId: z.string().optional(),
  asOf: localDateSchema.optional(),
});

export const GetReorderSuggestionsOutputSchema = z.object({
  items: z.array(ReorderSuggestionDtoSchema),
});

export type GetReorderSuggestionsInput = z.infer<typeof GetReorderSuggestionsInputSchema>;
export type GetReorderSuggestionsOutput = z.infer<typeof GetReorderSuggestionsOutputSchema>;
