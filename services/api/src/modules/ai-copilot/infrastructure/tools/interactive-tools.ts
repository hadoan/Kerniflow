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
export const buildCollectInputsTool = (description: string) =>
  tool<CollectInputsToolInput, CollectInputsToolOutput>({
    description,
    inputSchema: CollectInputsToolInputSchema,
    outputSchema: CollectInputsToolOutputSchema,
    toModelOutput: ({ output }) => {
      const lines: string[] = [];
      if (output?.meta?.cancelled) {
        lines.push("User cancelled input collection.");
      } else {
        lines.push("Collected inputs from user.");
      }
      const values = output?.values ?? {};
      lines.push(`Values: ${JSON.stringify(values)}`);
      if (output?.meta?.editedKeys?.length) {
        lines.push(`Edited keys: ${output.meta.editedKeys.join(", ")}`);
      }
      if (output?.meta?.filledAt) {
        lines.push(`Filled at: ${output.meta.filledAt}`);
      }
      lines.push("Continue the task using these values.");
      return { type: "text", value: lines.join("\n") };
    },
  });
