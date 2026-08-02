import { test, expect } from "../../../fixtures/cash-e2e.fixture.ts";
import { MonthlyReportPreviewPage } from "../../../pages/monthly-report-preview.page.ts";
import { CashAssistantPage } from "../../../pages/assistant.page.ts";

test.describe("Monthly Cash E2E - Kassenabrechnung", () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  test("Case 31, 32, 33: Monthly preview", async ({ cashContext, cashPage }) => {
    const monthKey = "2026-07";
    const reportPreview = new MonthlyReportPreviewPage(cashPage);

    // Activate the scenario for the mock AI
    await cashContext.e2eAi.activateScenario({
      id: "monthly-report",
      steps: [
        {
          assistantText: "Here is your monthly report.",
          toolCalls: [
            {
              name: "get_monthly_cash_report",
              args: {
                registerId: cashContext.register.id,
                year: 2026,
                month: 7,
              },
            },
          ],
        },
      ],
    });

    const assistant = new CashAssistantPage(cashPage);
    await cashPage.goto(`/assistant`);
    await assistant.sendMessage("Show me the monthly report for 2026-07.");

    const messages = await cashPage.locator("body").innerText();
    console.log("PAGE TEXT:", messages);

    // Verify HTML Preview renders
    await reportPreview.expectVisible();

    // Check coverage status
    await reportPreview.expectCoverageStatus("Unvollständig");

    // We seeded 0 days for this month, so it should report missing days (all of July has 31 days)
    // The exact message or structure depends on the UI, but it should indicate missing days
    await expect(reportPreview.previewContainer).toContainText("31");

    // Case 10 & 11: Visual print snapshot
    await cashPage.emulateMedia({ media: "print" });
    await expect(reportPreview.previewContainer).toHaveScreenshot("kassenabrechnung-print.png");
  });
});
