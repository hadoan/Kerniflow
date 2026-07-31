import { test, expect } from "../../../fixtures/cash-e2e.fixture.ts";
import { CashAssistantPage } from "../../../pages/assistant.page.ts";

test.describe("Daily Cash E2E - Business Bank Deposit Regression", () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  test("400€ deposit to business bank should ask for money source, not payment method", async ({
    cashContext,
    cashPage,
  }) => {
    const dayKey = "2026-07-29";
    const assistant = new CashAssistantPage(cashPage);

    await assistant.goto(cashContext.register.id, dayKey);

    // AI parses the input as a bank deposit, extracting known facts (400€ out, to business bank)
    await cashContext.e2eAi.activateScenario({
      id: "business-bank-deposit",
      steps: [
        {
          assistantText: "",
          toolCalls: [
            {
              name: "analyze_cash_movement",
              args: {
                amountCents: 40000,
                businessDate: dayKey,
                source: "UNKNOWN",
                destination: "BUSINESS_BANK_ACCOUNT",
              },
            },
          ],
        },
      ],
    });

    // User inputs the message
    await assistant.sendMessage("Ngày 29.7 e có bỏ 400€ vào Bankkonto Geschäft");

    // The backend's deterministic resolver should respond with a MONEY_SOURCE clarification, NOT PAYMENT_METHOD.
    // Ensure the question and the choices for MONEY_SOURCE are visible.

    // We expect a clarification asking where the money came from, not "How did the customer pay?"
    // Depending on the frontend implementation, the exact title may vary, but the choices are distinct.
    await expect(
      assistant.page.getByRole("button", {
        name: /Gehört noch zum aktuellen Kassenbestand|Still belongs to current register balance/i,
      })
    ).toBeVisible();
    await expect(
      assistant.page.getByRole("button", {
        name: /Wurde bereits als Entnahme gebucht|Already recorded as taken out/i,
      })
    ).toBeVisible();
    await expect(
      assistant.page.getByRole("button", { name: /Privates Geld|Private money/i })
    ).toBeVisible();

    // Ensure it doesn't show payment method options
    await expect(assistant.page.getByRole("button", { name: "Bar" })).not.toBeVisible();
    await expect(assistant.page.getByRole("button", { name: "Karte" })).not.toBeVisible();

    // The selected server-defined choice must be resolved through the persisted resolution,
    // not sent back through the language model. It prepares, but does not save, the entry.
    await assistant.page
      .getByRole("button", {
        name: /Gehört noch zum aktuellen Kassenbestand|Still belongs to current register balance/i,
      })
      .click();

    await expect(assistant.page.getByText(/Entry prepared: BANK_DEPOSIT.*OUT/i)).toBeVisible();
  });
});
