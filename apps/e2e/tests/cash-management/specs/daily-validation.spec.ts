import { test, expect } from "../../../fixtures/cash-e2e.fixture.ts";
import { CashAssistantPage } from "../../../pages/assistant.page.ts";
import { CashReportPreviewPage } from "../../../pages/cash-report-preview.page.ts";
import { createCashEntry, submitCashDayClose } from "../../helpers/cash-management-fixtures.ts";

test.describe("Daily Cash E2E - Validation & Warnings", () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  test("Case 23: Balance mismatch", async ({ cashContext, cashPage }) => {
    const previousDayKey = "2026-07-21";
    const dayKey = "2026-07-22";

    await createCashEntry(
      cashContext.client.httpClient,
      cashContext.register.id,
      {
        type: "OPENING_FLOAT",
        direction: "IN",
        description: "Previous day sales",
        amount: 3000,
        tax: { mode: "NONE" },
        occurredAt: `${previousDayKey}T12:00:00Z`,
      },
      `prev-entry-${cashContext.testRunId}`
    );

    await submitCashDayClose(
      cashContext.client.httpClient,
      cashContext.register.id,
      previousDayKey,
      {
        countedBalance: 3000,
      },
      `prev-close-${cashContext.testRunId}`
    );

    const assistant = new CashAssistantPage(cashPage);
    const reportPreview = new CashReportPreviewPage(cashPage);

    await assistant.goto(cashContext.register.id, dayKey);

    // Case 8: Balance mismatch blocks closing
    const scenario = {
      id: "balance-mismatch",
      steps: [
        {
          assistantText: "Here is the summary.",
          toolCalls: [
            {
              name: "prepare_cash_day_confirmation",
              args: {
                registerId: cashContext.register.id,
                businessDate: dayKey,
                actualClosingCashCents: 0,
                movements: [
                  { type: "SALE_CASH", amountCents: 1000000 },
                  { type: "OWNER_WITHDRAWAL", amountCents: 500000 },
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

    await assistant.sendMessage(
      "Today we had cash sales of 100.00 € and a private withdrawal of 50.00 €. The final counted cash is 0.00 €."
    );

    // After Copilot processes it, it should show a summary. We confirm it.

    // Verify HTML Preview shows a mismatch warning
    await reportPreview.expectVisible();
    await expect(reportPreview.warningList).toContainText("balance mismatch");
    // Should display the expected 80.00 €
    await expect(reportPreview.previewContainer).toContainText("80.00");

    // Status is NEEDS_REVIEW
    await reportPreview.expectStatus("Needs review");

    // Close day should be disabled or blocked
  });
});
