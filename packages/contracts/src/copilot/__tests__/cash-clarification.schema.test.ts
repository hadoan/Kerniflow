import { describe, expect, it } from "vitest";
import {
  CashClarificationType,
  CASH_CLARIFICATION_CONTENT,
  RequestCashClarificationInputSchema,
  RequestCashClarificationOutputSchema,
} from "../cash-clarification";

describe("Cash Clarification Contracts", () => {
  it("defines content lookup for every CashClarificationType", () => {
    for (const type of Object.values(CashClarificationType)) {
      const content = CASH_CLARIFICATION_CONTENT[type];
      expect(content).toBeDefined();
      expect(content.question.en).toBeTruthy();
      expect(content.question.de).toBeTruthy();
      expect(content.question.vi).toBeTruthy();
      expect(content.choices.length).toBeGreaterThan(0);
      for (const choice of content.choices) {
        expect(choice.id).toBeTruthy();
        expect(choice.label.en).toBeTruthy();
        expect(choice.label.de).toBeTruthy();
        expect(choice.label.vi).toBeTruthy();
      }
    }
  });

  it("parses valid RequestCashClarificationInput", () => {
    const input = {
      clarificationType: CashClarificationType.MONEY_DESTINATION,
      amountCents: 12960,
      locale: "vi" as const,
    };
    const parsed = RequestCashClarificationInputSchema.safeParse(input);
    expect(parsed.success).toBe(true);
  });

  it("parses valid RequestCashClarificationOutput", () => {
    const output = {
      clarificationId: "clarify-123",
      choiceId: "PRIVATE_WITHDRAWAL" as const,
      label: "Dùng cá nhân",
    };
    const parsed = RequestCashClarificationOutputSchema.safeParse(output);
    expect(parsed.success).toBe(true);
  });

  it("offers a same-fund choice for cash stored outside the drawer", () => {
    const content = CASH_CLARIFICATION_CONTENT[CashClarificationType.CASH_FUND_SCOPE];

    expect(content.question.vi).toContain("cùng quỹ tiền mặt");
    expect(content.choices.map((choice) => choice.id)).toEqual([
      "SAME_BUSINESS_CASH_FUND",
      "SEPARATE_CASH_FUND",
    ]);
  });

  it("asks for total business cash across storage locations", () => {
    expect(
      CASH_CLARIFICATION_CONTENT[CashClarificationType.ACTUAL_CLOSING_CASH].question.vi
    ).toContain("bao gồm tiền trong ngăn kéo và tiền đã cất trong két hoặc hộp");
  });
});
