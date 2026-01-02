import { tool } from "ai";
import {
  CollectInputsToolInputSchema,
  CollectInputsToolOutputSchema,
  type CollectInputsToolInput,
  type CollectInputsToolOutput,
} from "@corely/contracts";

/**
 * Client-handled tool that asks the user to provide structured inputs.
 * No execute handler is provided so the client must respond via addToolResult.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const collectInputsTool = (tool as any)<CollectInputsToolInput, CollectInputsToolOutput>({
  name: "collect_inputs",
  description: "Ask the user for structured inputs (form fields) before proceeding with an action.",
  parameters: CollectInputsToolInputSchema,
  execute: async () => ({
    values: {},
    meta: { cancelled: true },
  }),
  output: CollectInputsToolOutputSchema,
});
