import { z } from "zod";

export const copilotMessageMetadataSchema = z
  .object({
    runId: z.string().optional(),
  })
  .passthrough();

export type CopilotMessageMetadata = z.infer<typeof copilotMessageMetadataSchema>;
