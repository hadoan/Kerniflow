import { test, expect } from "../../../fixtures/cash-e2e.fixture.ts";
import { CashAssistantPage } from "../../../pages/assistant.page.ts";
import { listCashEntries } from "../../helpers/cash-management-fixtures.ts";

test.describe("Daily Cash E2E - REST Entry Confirmation", () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  test("REST-based confirmation does not invoke LLM", async ({ cashContext, cashPage }) => {
    const dayKey = "2026-07-22";
    const assistant = new CashAssistantPage(cashPage);

    await assistant.goto(cashContext.register.id, dayKey);

    const scenario = {
      id: "prepare-entry-and-rest-confirm",
      steps: [
        {
          assistantText: "I've prepared the cash entry.",
          toolCalls: [
            {
              name: "prepare_cash_entry_confirmation",
              args: {
                registerId: cashContext.register.id,
                businessDate: dayKey,
                movementType: "SALE_CASH",
                amountCents: 3000,
                description: "Coffee",
                idempotencyKey: "$$LAST_IDEMPOTENCY_KEY$$",
              },
            },
          ],
        },
      ],
    };
    await cashContext.e2eAi.activateScenario(scenario);

    await assistant.chatInput.fill(
      "I sold a coffee for 30,00 € in cash. Please prepare and save this entry now."
    );
    await assistant.chatSubmitButton.click();
    await assistant.waitForResponse();

    // Wait until the summary card is rendered
    await expect(cashPage.getByText("Confirm Cash Entry")).toBeVisible();
    await expect(cashPage.getByText(/Coffee/)).toBeVisible();

    // Set a scenario that throws an error if it's called, to prove the LLM is NOT called
    await cashContext.e2eAi.activateScenario({
      id: "fail-if-called",
      steps: [
        {
          assistantText: "ERROR_LLM_SHOULD_NOT_BE_CALLED",
          toolCalls: [],
        },
      ],
    });

    // Verify DB BEFORE confirming
    let { entries } = await listCashEntries(
      cashContext.client.httpClient,
      cashContext.register.id,
      { dayKey }
    );
    expect(entries.length).toBe(0);

    // Click confirm button on the card
    await cashPage.getByRole("button", { name: "Confirm" }).click();

    // Verify the card turns into a consumed state
    await expect(cashPage.getByText("Saved")).toBeVisible();

    // Verify DB AFTER confirming
    let dbResult = await listCashEntries(cashContext.client.httpClient, cashContext.register.id, {
      dayKey,
    });
    entries = dbResult.entries;
    expect(entries.length).toBe(1);
    expect(entries[0].amountCents).toBe(3000);
    expect(entries[0].type).toBe("SALE_CASH");
    expect(entries[0].description).toBe("Coffee");
  });
});
