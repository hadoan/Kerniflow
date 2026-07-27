import { test, expect } from "../../../fixtures/cash-e2e.fixture.ts";
import { CashAssistantPage } from "../../../pages/assistant.page.ts";
import { CashReportPreviewPage } from "../../../pages/cash-report-preview.page.ts";
import { getCashDayClose } from "../../helpers/cash-management-fixtures.ts";

test.describe("Daily Cash E2E - Closing", () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  test("Case 27 & 28: Preview does not close, but explicit close does", async ({ cashContext, cashPage }) => {
    const dayKey = "2026-07-22";
    const assistant = new CashAssistantPage(cashPage);
    const reportPreview = new CashReportPreviewPage(cashPage);

    await assistant.goto(cashContext.register.id, dayKey);

    // Cases 9: Valid explicit close
    const scenario = {
      id: "valid-close",
      steps: [
        {
          assistantText: "Here is the summary.",
          toolCalls: [
            {
              name: "prepare_cash_day_confirmation",
              args: {
                registerId: cashContext.register.id,
                businessDate: dayKey, actualClosingCashCents: 0,
                movements: [
                  { type: "SALE_CASH", amountCents: 2000000 }
                ],
                actualClosingCashCents: 2000000
              }
            },
            {
              name: "get_cash_report_preview",
              args: {
                registerId: cashContext.register.id,
                businessDate: dayKey, actualClosingCashCents: 0,
              }
            }
          ]
        }
      ]
    };
    await cashContext.e2eAi.activateScenario(scenario);

    await assistant.sendMessage(
      "Today cash sales are 200.00 €. Final counted cash is 200.00 €."
    );

    // Confirm candidate
    

    // Verify HTML Preview is in Ready to close state
    await reportPreview.expectVisible();
    await reportPreview.expectStatus("Ready to close");

    // Case 27: Verify Day is NOT closed in DB yet
    let dayCloseReq = await getCashDayClose(cashContext.client.httpClient, cashContext.register.id, dayKey);
    expect(dayCloseReq.dayClose.status).not.toBe("CLOSED");
    expect(dayCloseReq.dayClose.closedAt).toBeNull();

    // Case 28: Valid explicit close
    await cashContext.e2eAi.activateScenario({
      id: "valid-close-2",
      steps: [
        {
          assistantText: "The day has been closed.",
          toolCalls: [
            {
              name: "confirm_cash_day_draft",
              args: {
                registerId: cashContext.register.id,
                businessDate: dayKey, actualClosingCashCents: 0,
                confirmationId: "$$LAST_CONFIRMATION_ID$$",
                idempotencyKey: "$$LAST_IDEMPOTENCY_KEY$$"
              }
            }
          ]
        }
      ]
    });
    
    await assistant.sendMessage("Please close the day.");

    // Wait for UI to update status
    // Note: status is updated by a new tool output or by polling, 
    // but in E2E with mock AI, the preview might not automatically re-fetch unless another preview is rendered.
    // For now, let's just wait for the assistant's message.
    await assistant.page.getByText("The day has been closed.").waitFor();

    // Verify DB Day is CLOSED
    dayCloseReq = await getCashDayClose(cashContext.client.httpClient, cashContext.register.id, dayKey);
    expect(dayCloseReq.dayClose.status).toBe("CLOSED");
    expect(dayCloseReq.dayClose.closedAt).not.toBeNull();

    // Print snapshot
    await cashPage.emulateMedia({ media: "print" });
    await expect(reportPreview.previewContainer).toHaveScreenshot("kassenbericht-print.png");
  });
});
