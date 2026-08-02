import { test, expect } from "../../../fixtures/cash-e2e.fixture.ts";
import { CashAssistantPage } from "../../../pages/assistant.page.ts";
import { listCashEntries } from "../../helpers/cash-management-fixtures.ts";

test.describe("Daily Cash E2E - Confirmation Security", () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  test("Case 12 & 13: No writes before explicit confirmation", async ({
    cashContext,
    cashPage,
  }) => {
    const dayKey = "2026-07-22";
    const assistant = new CashAssistantPage(cashPage);

    await assistant.goto(cashContext.register.id, dayKey);

    // Cases 6 & 7: No writes before explicit confirmation, Confirm and save
    const scenario = {
      id: "confirm-and-save",
      steps: [
        {
          assistantText: "Here is your summary.",
          toolCalls: [
            {
              name: "prepare_cash_day_confirmation",
              args: {
                registerId: cashContext.register.id,
                businessDate: dayKey,
                actualClosingCashCents: 0,
                movements: [{ type: "SALE_CASH", amountCents: 2000000 }],
                actualClosingCashCents: 2000000,
              },
            },
            {
              name: "get_cash_report_preview",
              args: {
                registerId: cashContext.register.id,
                businessDate: dayKey,
                actualClosingCashCents: 0,
              },
            },
          ],
        },
      ],
    };
    await cashContext.e2eAi.activateScenario(scenario);

    await assistant.sendMessage("Today cash sales are 200.00 €. Final counted cash is 200.00 €.");

    // Wait until the summary is rendered
    await expect(cashPage.getByTestId("cash-report-preview")).toBeVisible();

    // Verify DB BEFORE confirming
    let { entries } = await listCashEntries(
      cashContext.client.httpClient,
      cashContext.register.id,
      { dayKey }
    );
    expect(entries.length).toBe(0); // No cash entries exist yet

    // Explicitly confirm conversationally
    await cashContext.e2eAi.activateScenario({
      id: "confirm-and-save-step-2",
      steps: [
        {
          assistantText: "I have confirmed and saved the day.",
          toolCalls: [
            {
              name: "confirm_cash_day_draft",
              args: {
                registerId: cashContext.register.id,
                businessDate: dayKey,
                actualClosingCashCents: 0,
                confirmationId: "$$LAST_CONFIRMATION_ID$$",
                idempotencyKey: "$$LAST_IDEMPOTENCY_KEY$$",
              },
            },
          ],
        },
      ],
    });
    await assistant.sendMessage("Yes, confirm it.");

    // Verify DB AFTER confirming
    // Wait until the confirmation is processed (we can wait for the AI's response text)
    await assistant.page.getByText("I have confirmed and saved the day.").waitFor();

    let dbResult = await listCashEntries(cashContext.client.httpClient, cashContext.register.id, {
      dayKey,
    });
    entries = dbResult.entries;
    expect(entries.length).toBeGreaterThan(0); // Records now created
  });
});
