import { test, expect } from "../../../fixtures/cash-e2e.fixture.ts";
import { CashAssistantPage } from "../../../pages/assistant.page.ts";
import { CashReportPreviewPage } from "../../../pages/cash-report-preview.page.ts";
import { listCashEntries } from "../../helpers/cash-management-fixtures.ts";

test.describe("Daily Cash E2E - Generic Clarification Flow", () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  test("Scenario 3: Ambiguous withdrawal triggers request_cash_clarification", async ({
    cashContext,
    cashPage,
  }) => {
    const dayKey = "2026-07-22";
    const assistant = new CashAssistantPage(cashPage);

    await assistant.goto(cashContext.register.id, dayKey);

    // 1. Ambiguous withdrawal intent: LLM must call request_cash_clarification, NOT prepare_cash_day_confirmation or write tools
    await cashContext.e2eAi.activateScenario({
      id: "clarify-withdrawal-destination",
      steps: [
        {
          assistantText: "Em lấy 129,60 € ra để làm gì?",
          toolCalls: [
            {
              name: "request_cash_clarification",
              args: {
                clarificationType: "MONEY_DESTINATION",
                amountCents: 12960,
                locale: "vi",
              },
            },
          ],
        },
      ],
    });

    await assistant.sendMessage("Hôm nay em rút hết 129,60 € ra.");

    // Assert question and quick-choice buttons render
    await expect(assistant.page.getByText("Em lấy tiền ra để làm gì?").first()).toBeVisible();
    await expect(assistant.page.getByRole("button", { name: "Dùng cá nhân" })).toBeVisible();
    await expect(
      assistant.page.getByRole("button", { name: "Nộp vào tài khoản ngân hàng của tiệm" })
    ).toBeVisible();
    await expect(
      assistant.page.getByRole("button", { name: "Mua hàng hoặc trả chi phí cho tiệm" })
    ).toBeVisible();
    await expect(
      assistant.page.getByRole("button", { name: "Tiền vẫn còn trong ngăn kéo" })
    ).toBeVisible();

    // Assert NO financial entries created in DB
    const { entries } = await listCashEntries(
      cashContext.client.httpClient,
      cashContext.register.id,
      { dayKey }
    );
    expect(entries.length).toBe(0);
  });

  test("Clarification 2: Ambiguous bank deposit account ownership", async ({
    cashContext,
    cashPage,
  }) => {
    const dayKey = "2026-07-22";
    const assistant = new CashAssistantPage(cashPage);

    await assistant.goto(cashContext.register.id, dayKey);

    await cashContext.e2eAi.activateScenario({
      id: "clarify-account-ownership",
      steps: [
        {
          assistantText: "Anh/chị nộp vào tài khoản nào?",
          toolCalls: [
            {
              name: "request_cash_clarification",
              args: {
                clarificationType: "ACCOUNT_OWNERSHIP",
                amountCents: 40000,
                locale: "vi",
              },
            },
          ],
        },
      ],
    });

    await assistant.sendMessage("Em nộp 400 € vào tài khoản.");

    await expect(assistant.page.getByText("Anh/chị nộp vào tài khoản nào?").first()).toBeVisible();
    await expect(
      assistant.page.getByRole("button", { name: "Tài khoản ngân hàng của tiệm" })
    ).toBeVisible();
    await expect(assistant.page.getByRole("button", { name: "Tài khoản cá nhân" })).toBeVisible();
  });

  test("Clarification 3: Ambiguous purchase purpose", async ({ cashContext, cashPage }) => {
    const dayKey = "2026-07-22";
    const assistant = new CashAssistantPage(cashPage);

    await assistant.goto(cashContext.register.id, dayKey);

    await cashContext.e2eAi.activateScenario({
      id: "clarify-purchase-purpose",
      steps: [
        {
          assistantText: "Khoản mua/chi phí này thuộc loại nào?",
          toolCalls: [
            {
              name: "request_cash_clarification",
              args: {
                clarificationType: "PURCHASE_PURPOSE",
                amountCents: 5000,
                locale: "vi",
              },
            },
          ],
        },
      ],
    });

    await assistant.sendMessage("Em mua đồ 50 €.");

    await expect(assistant.page.getByText("Khoản mua/chi phí này thuộc loại nào?").first()).toBeVisible();
    await expect(
      assistant.page.getByRole("button", { name: "Mua hàng hóa / nguyên liệu cho tiệm" })
    ).toBeVisible();
  });

  test("Clarification 4: Real vs hypothetical question", async ({ cashContext, cashPage }) => {
    const dayKey = "2026-07-22";
    const assistant = new CashAssistantPage(cashPage);

    await assistant.goto(cashContext.register.id, dayKey);

    await cashContext.e2eAi.activateScenario({
      id: "clarify-real-vs-hypothetical",
      steps: [
        {
          assistantText: "Đây là giao dịch thực hay câu hỏi giả định?",
          toolCalls: [
            {
              name: "request_cash_clarification",
              args: {
                clarificationType: "REAL_OR_HYPOTHETICAL",
                locale: "vi",
              },
            },
          ],
        },
      ],
    });

    await assistant.sendMessage("Nếu em lấy 100 € về dùng cá nhân thì ghi thế nào?");

    await expect(
      assistant.page.getByText("Đây là giao dịch thực hay câu hỏi giả định?").first()
    ).toBeVisible();
    await expect(
      assistant.page.getByRole("button", { name: "Giả định — chỉ để hiểu thôi" })
    ).toBeVisible();

    const { entries } = await listCashEntries(
      cashContext.client.httpClient,
      cashContext.register.id,
      { dayKey }
    );
    expect(entries.length).toBe(0);
  });

  test("Full Scenario 3: Clarification -> Choice select -> Closing count -> Confirmation", async ({
    cashContext,
    cashPage,
  }) => {
    const dayKey = "2026-07-22";
    const assistant = new CashAssistantPage(cashPage);
    const reportPreview = new CashReportPreviewPage(cashPage);

    await assistant.goto(cashContext.register.id, dayKey);

    // Step 1: User sends ambiguous withdrawal message
    await cashContext.e2eAi.activateScenario({
      id: "ambiguous-step-1",
      steps: [
        {
          assistantText: "Em lấy 129,60 € ra để làm gì?",
          toolCalls: [
            {
              name: "request_cash_clarification",
              args: {
                clarificationType: "MONEY_DESTINATION",
                amountCents: 12960,
                locale: "vi",
              },
            },
          ],
        },
      ],
    });

    await assistant.sendMessage("Hôm nay em rút hết 129,60 € ra.");

    // Step 2: User clicks "Dùng cá nhân" button on clarification card
    await cashContext.e2eAi.activateScenario({
      id: "ambiguous-step-2",
      steps: [
        {
          assistantText: "Sau khi lấy tiền ra, em đếm thực tế trong ngăn kéo còn bao nhiêu?",
        },
      ],
    });

    await assistant.page.getByRole("button", { name: "Dùng cá nhân" }).click();
    await expect(
      assistant.page.getByText("Sau khi lấy tiền ra, em đếm thực tế trong ngăn kéo còn bao nhiêu?").first()
    ).toBeVisible();

    // Verify still no entries in DB
    let { entries } = await listCashEntries(
      cashContext.client.httpClient,
      cashContext.register.id,
      { dayKey }
    );
    expect(entries.length).toBe(0);

    // Step 3: User answers closing cash count: "Trong ngăn kéo còn 0 €."
    await cashContext.e2eAi.activateScenario({
      id: "ambiguous-step-3",
      steps: [
        {
          assistantText: "Tôi đã chuẩn bị thông tin xác nhận.",
          toolCalls: [
            {
              name: "prepare_cash_day_confirmation",
              args: {
                registerId: cashContext.register.id,
                businessDate: dayKey,
                actualClosingCashCents: 0,
                movements: [{ type: "OWNER_WITHDRAWAL", amountCents: 12960 }],
              },
            },
            {
              name: "get_cash_report_preview",
              args: {
                registerId: cashContext.register.id,
                businessDate: dayKey,
              },
            },
          ],
        },
        {
          assistantText: "Mời bạn kiểm tra.",
        }
      ],
    });

    await assistant.sendMessage("Trong ngăn kéo còn 0 €.");

    // Step 4: User confirms draft
    await cashContext.e2eAi.activateScenario({
      id: "ambiguous-step-4",
      steps: [
        {
          assistantText: "Đã xác nhận và lưu.",
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
        {
          assistantText: "Hoàn tất.",
        }
      ],
    });

    await assistant.sendMessage("Xác nhận và lưu.");

    await reportPreview.expectVisible();
    await reportPreview.expectAmount("Privatentnahmen", "129.60 €");

    entries = (
      await listCashEntries(cashContext.client.httpClient, cashContext.register.id, { dayKey })
    ).entries;
    const withdrawal = entries.find(
      (e) => e.type === "PRIVATE_WITHDRAWAL" || e.type === "OWNER_WITHDRAWAL"
    );
    expect(withdrawal).toBeDefined();
  });
});
