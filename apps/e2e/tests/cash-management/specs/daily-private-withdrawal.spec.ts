import { test, expect } from "../../../fixtures/cash-e2e.fixture.ts";
import { CashAssistantPage } from "../../../pages/assistant.page.ts";
import { CashReportPreviewPage } from "../../../pages/cash-report-preview.page.ts";
import { listCashEntries } from "../../helpers/cash-management-fixtures.ts";

test.describe("Daily Cash E2E - Private Withdrawal", () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  test("Case 4: Full private withdrawal", async ({ cashContext, cashPage }) => {
    const dayKey = "2026-07-22";
    const assistant = new CashAssistantPage(cashPage);
    const reportPreview = new CashReportPreviewPage(cashPage);

    await assistant.goto(cashContext.register.id, dayKey);

    // Case 4: Full private withdrawal
    const scenario = {
      id: "private-withdrawal-full",
      steps: [
        {
          assistantText: "I have prepared the cash day summary for your review.",
          toolCalls: [
            {
              name: "prepare_cash_day_confirmation",
              args: {
                registerId: cashContext.register.id,
                businessDate: dayKey,
                actualClosingCashCents: 0,
                movements: [
                  { type: "SALE_CASH", amountCents: 1296000 },
                  { type: "OWNER_WITHDRAWAL", amountCents: 1296000 },
                ],
                actualClosingCashCents: 0,
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

    // Provide the facts to the AI Copilot
    await assistant.sendMessage(
      "Today we had cash sales of 129.60 €. I withdrew 129.60 € for personal use (Privatentnahme). We had 4 customers. The final counted cash in the drawer is 0.00 €."
    );

    // Confirm conversationally
    await cashContext.e2eAi.activateScenario({
      id: "confirm-private-withdrawal",
      steps: [
        {
          assistantText: "Confirmed.",
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
    await assistant.page.getByText("Confirmed.").waitFor();

    // Verify the HTML Preview renders
    await reportPreview.expectVisible();
    await reportPreview.expectStatus("Ready to close");

    // Check balances in preview
    await reportPreview.expectAmount("Kassenbestand bei Geschäftsschluss", "0.00 €");
    await reportPreview.expectAmount("Privatentnahmen", "129.60 €");
    await reportPreview.expectAmount("Kassenendbestand des Vortages", "0.00 €");
    await reportPreview.expectAmount("Bareinnahmen/Tageslosung", "129.60 €");
    await reportPreview.expectAmount("Kundenzahl", "4");

    // Verify database entries directly
    const { entries } = await listCashEntries(
      cashContext.client.httpClient,
      cashContext.register.id,
      {
        dayKey,
      }
    );

    const cashSale = entries.find((e) => e.type === "SALE_CASH");
    expect(cashSale).toBeDefined();
    expect(cashSale?.amount).toBe(12960);

    const withdrawal = entries.find((e) => e.type === "PRIVATE_WITHDRAWAL");
    expect(withdrawal).toBeDefined();
    expect(withdrawal?.amount).toBe(12960);
  });
});
