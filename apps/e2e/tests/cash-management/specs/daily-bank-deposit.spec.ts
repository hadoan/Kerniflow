import { test, expect } from "../../../fixtures/cash-e2e.fixture.ts";
import { CashAssistantPage } from "../../../pages/assistant.page.ts";
import { CashReportPreviewPage } from "../../../pages/cash-report-preview.page.ts";
import { listCashEntries, createCashEntry, submitCashDayClose } from "../../helpers/cash-management-fixtures.ts";

test.describe("Daily Cash E2E - Bank Deposit & Purchases", () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  test("Case 8: Business bank deposit", async ({ cashContext, cashPage, request }) => {
    const previousDayKey = "2026-07-21";
    const dayKey = "2026-07-22";

    // Setup previous day's closing cash to 330.00 €
    await createCashEntry(cashContext.client.httpClient, cashContext.register.id, {
      type: "OPENING_FLOAT",
      direction: "IN",
      description: "Previous day sales",
      amount: 33000,
      tax: { mode: "NONE" },
      occurredAt: `${previousDayKey}T12:00:00Z`
    }, `prev-entry-${cashContext.testRunId}`);
    
    await submitCashDayClose(cashContext.client.httpClient, cashContext.register.id, previousDayKey, {
      countedBalance: 33000,
    }, `prev-close-${cashContext.testRunId}`);

    const assistant = new CashAssistantPage(cashPage);
    const reportPreview = new CashReportPreviewPage(cashPage);

    await assistant.goto(cashContext.register.id, dayKey);

    // Case 5: Business bank deposit
    const scenario = {
      id: "business-bank-deposit",
      steps: [
        {
          assistantText: "I have prepared the draft for your review.",
          toolCalls: [
            {
              name: "prepare_cash_day_confirmation",
              args: {
                registerId: cashContext.register.id,
                businessDate: dayKey, actualClosingCashCents: 0,
                movements: [
                  { type: "SALE_CASH", amountCents: 1000000 },
                  { type: "BANK_DEPOSIT", amountCents: 4000000 }
                ],
                actualClosingCashCents: 300000
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

    // Provide facts to AI Copilot
    await assistant.sendMessage(
      "Today cash sales are 100.00 €. I deposited 400.00 € into the business bank account. Actual closing cash is 30.00 €."
    );

    // Confirm conversationally
    await cashContext.e2eAi.activateScenario({
      id: "confirm-bank-deposit",
      steps: [
        {
          assistantText: "Confirmed.",
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
    await assistant.sendMessage("Yes, confirm it.");
    await assistant.page.getByText("Confirmed.").waitFor();

    // Verify HTML Preview
    await reportPreview.expectVisible();
    await reportPreview.expectAmount("Kassenbestand bei Geschäftsschluss", "30.00 €");
    await reportPreview.expectAmount("Bareinnahmen/Tageslosung", "100.00 €");
    
    // Ensure it shows up as a bank deposit
    await expect(reportPreview.previewContainer).toContainText("400.00 €");
    
    // Verify evidence requirements (BANK_SLIP required should be indicated by AI or preview, checking DB instead)
    const { entries } = await listCashEntries(cashContext.client.httpClient, cashContext.register.id, { dayKey });

    const bankDeposit = entries.find((e) => e.type === "BANK_DEPOSIT");
    expect(bankDeposit).toBeDefined();
    expect(bankDeposit?.amount).toBe(40000);
    
    // Should NOT be classified as private withdrawal
    const privateWithdrawal = entries.find((e) => e.type === "PRIVATE_WITHDRAWAL");
    expect(privateWithdrawal).toBeUndefined();
  });
});
