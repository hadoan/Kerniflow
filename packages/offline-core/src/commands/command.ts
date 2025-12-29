import { type z } from "zod";

export interface CommandDefinition<TPayload = unknown> {
  type: string;
  schema: z.ZodType<TPayload>;
  /**
   * Optional hook to tag payloads or enrich them before persistence.
   * Implementations can use this to add client-side metadata.
   */
  normalize?: (payload: TPayload) => TPayload;
}
