import { tool } from "ai";
import {
  CollectInputsToolInputSchema,
  type CollectInputsToolInput,
  type CollectInputsToolOutput,
  CollectInputsToolOutputSchema,
  RequestCashClarificationInputSchema,
  type RequestCashClarificationInput,
  type RequestCashClarificationOutput,
  RequestCashClarificationOutputSchema,
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

/**
 * Client-handled tool that asks the user to clarify an ambiguous cash fact.
 * No execute handler is provided so the client must respond via addToolResult with choiceId.
 */
export const buildRequestCashClarificationTool = (description: string) =>
  tool<RequestCashClarificationInput, RequestCashClarificationOutput>({
    description,
    inputSchema: RequestCashClarificationInputSchema,
    outputSchema: RequestCashClarificationOutputSchema,
    toModelOutput: ({ output }) => {
      const lines: string[] = [];
      lines.push("User responded to cash clarification.");
      lines.push(`Clarification ID: ${output?.clarificationId}`);
      lines.push(`Choice ID: ${output?.choiceId}`);
      lines.push(`Selected Label: ${output?.label}`);
      lines.push("Map choiceId to domain fact and continue the workflow.");
      return { type: "text", value: lines.join("\n") };
    },
  });
