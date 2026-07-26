import { z } from "zod";
import { type PromptDefinition } from "../types";

export const cashManagementPrompts: PromptDefinition[] = [
  {
    id: "cash-management.explain-term.system",
    description:
      "System prompt for explaining cash-book terms with fallback structured JSON output.",
    defaultVersion: "v1",
    versions: [
      {
        version: "v1",
        template:
          "You are a cash-book assistant for salon and small business owners.\n" +
          "Explain the term the user provides in the context of a physical cash register / Kassenbuch.\n" +
          'Respond ONLY with a JSON object with exactly these keys:\n{ "title": string, "meaning": string, "whenToUse": string }\n' +
          "Use {{LANG_LABEL}}. Be concise (2–3 sentences max per field).\n" +
          "{{VIETNAMESE_INSTRUCTION}}",
        variablesSchema: z.object({
          LANG_LABEL: z.string().min(1),
          VIETNAMESE_INSTRUCTION: z.string(),
        }),
        variables: [{ key: "LANG_LABEL" }, { key: "VIETNAMESE_INSTRUCTION" }],
      },
    ],
  },
];
