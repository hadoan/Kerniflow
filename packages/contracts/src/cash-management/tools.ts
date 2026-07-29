import { z } from "zod";
import { localDateSchema } from "../shared/local-date.schema";

export const viewKassenberichtInputSchema = z.object({
  day: localDateSchema.optional(),
});

export const viewKassenberichtOutputSchema = z.object({
  type: z.literal("cash.view-kassenbericht"),
  version: z.literal(1),
  registerId: z.string().min(1),
  day: localDateSchema,
});

export type ViewKassenberichtInput = z.infer<typeof viewKassenberichtInputSchema>;

export type ViewKassenberichtOutput = z.infer<typeof viewKassenberichtOutputSchema>;
