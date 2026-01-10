import { tool } from "ai";
import {
  CollectInputsToolInputSchema,
  type CollectInputsToolInput,
  type CollectInputsToolOutput,
  CollectInputsToolOutputSchema,
} from "@corely/contracts";

/**
 * Client-handled tool that asks the user to provide structured inputs.
 * No execute handler is provided so the client must respond via addToolResult.
 */
export const collectInputsTool = tool<CollectInputsToolInput, CollectInputsToolOutput>({
  description:
    "Ask the user for structured inputs (form fields) before proceeding. " +
    "Supported field types: text, number, select, textarea, date (YYYY-MM-DD), " +
    "datetime (date+time), boolean (yes/no). Use the most specific type. " +
    "Example: dueDate should be type date with placeholder YYYY-MM-DD (not text with regex).",
  inputSchema: CollectInputsToolInputSchema,
  outputSchema: CollectInputsToolOutputSchema,
});
