import { tool } from "ai";
import {
  CollectInputsToolInputSchema,
  type CollectInputsToolInput,
  type CollectInputsToolOutput,
} from "@corely/contracts";

/**
 * Client-handled tool that asks the user to provide structured inputs.
 * No execute handler is provided so the client must respond via addToolResult.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const collectInputsTool = (tool as any)<CollectInputsToolInput, CollectInputsToolOutput>({
  description: "Ask the user for structured inputs (form fields) before proceeding with an action.",
  inputSchema: CollectInputsToolInputSchema,
  execute: async () => ({
    values: {},
    meta: { cancelled: true },
  }),
});
