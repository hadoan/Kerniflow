import {
  CASH_CLARIFICATION_CONTENT,
  CashClarificationType,
} from "@corely/contracts";

type SupportedLocale = "en" | "de" | "vi";

export interface ResolvedCashClarificationContent {
  question: string;
  choices: Array<{
    id: string;
    label: string;
  }>;
}

export function resolveCashClarificationContent(params: {
  type: string;
  allowedChoiceValues: string[];
  locale: string;
}): ResolvedCashClarificationContent {
  const definition = CASH_CLARIFICATION_CONTENT[params.type as CashClarificationType];
  const safeLocale = (params.locale as SupportedLocale) || "en";

  if (!definition) {
    return {
      question: "Please clarify",
      choices: params.allowedChoiceValues.map((value) => ({
        id: value,
        label: value,
      })),
    };
  }

  // Find the translation for the question
  const question =
    definition.question[safeLocale as "en" | "de" | "vi"] ??
    definition.question.en ??
    "Please clarify";

  // Map choices based on the server's allowedChoiceValues
  const choices = params.allowedChoiceValues.map((value) => {
    // Attempt to find the pre-defined choice in the content registry
    const registeredChoice = definition.choices.find((c) => c.id === value);

    const label =
      registeredChoice?.label[safeLocale as "en" | "de" | "vi"] ??
      registeredChoice?.label.en ??
      value; // Fallback to raw ID if translation is missing

    return {
      id: value,
      label,
    };
  });

  return {
    question,
    choices,
  };
}
