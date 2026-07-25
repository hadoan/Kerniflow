import path from "node:path";
import { test, expect } from "../fixtures.ts";
import { selectors } from "../../utils/selectors.ts";
import { loginAsSeededUser } from "../helpers/auth.ts";
import { getOnboardingProgress, primeAuthenticatedSession } from "../helpers/onboarding-helper.ts";

const invalidReceiptPath = path.resolve(process.cwd(), "fixtures/receipt-invalid.txt");

test.describe("Cash management onboarding - validation and skip paths", () => {
  test("blocks progression with invalid inputs", async ({ page, request, testData }) => {
    const auth = await loginAsSeededUser(request, testData);
    await primeAuthenticatedSession(page, {
      accessToken: auth.accessToken,
      workspaceId: auth.workspaceId,
    });

    await page.goto("/onboarding/cash-management");
    await page.click(selectors.onboarding.welcomeNext);
    await page.click(selectors.onboarding.languageOption("en"));
    await page.click(selectors.onboarding.languageNext);

    const businessNext = page.locator(selectors.onboarding.businessNext);
    await expect(businessNext).toBeDisabled();

    await page.fill(selectors.onboarding.businessName, "Salon Test");
    await page.click(selectors.onboarding.businessCategory);
    await page.click(selectors.onboarding.businessCategoryOption("beauty"));
    await page.click(selectors.onboarding.businessCurrency);
    await page.click(selectors.onboarding.businessCurrencyOption("EUR"));
    await expect(businessNext).toBeEnabled();
    await businessNext.click();

    await page.click(selectors.onboarding.workflowOption("paper"));
    await page.click(selectors.onboarding.workflowNext);

    await page.fill(selectors.onboarding.openingBalanceInput, "abc");
    await expect(page.locator(selectors.onboarding.openingBalanceError)).toBeVisible();
    await expect(page.locator(selectors.onboarding.openingBalanceNext)).toBeDisabled();

    await page.fill(selectors.onboarding.openingBalanceInput, "120");
    await page.click(selectors.onboarding.openingBalanceNext);
    await expect(page.locator(selectors.onboarding.stepContainer)).toHaveAttribute(
      "data-step-id",
      "first-entries"
    );

    await page.fill(selectors.onboarding.entryAmount, "bad");
    await page.fill(selectors.onboarding.entryNote, "Test entry");
    await expect(page.locator(selectors.onboarding.entryAmountError)).toBeVisible();
    await expect(page.locator(selectors.onboarding.entrySubmit)).toBeDisabled();
  });

  test("skips receipt upload and shows reminder", async ({ page, request, testData }) => {
    const auth = await loginAsSeededUser(request, testData);
    await primeAuthenticatedSession(page, {
      accessToken: auth.accessToken,
      workspaceId: auth.workspaceId,
    });

    await page.goto("/onboarding/cash-management");
    await page.click(selectors.onboarding.welcomeNext);
    await page.click(selectors.onboarding.languageOption("en"));
    await page.click(selectors.onboarding.languageNext);

    await page.fill(selectors.onboarding.businessName, "Salon Test");
    await page.click(selectors.onboarding.businessCategory);
    await page.click(selectors.onboarding.businessCategoryOption("beauty"));
    await page.click(selectors.onboarding.businessCurrency);
    await page.click(selectors.onboarding.businessCurrencyOption("EUR"));
    await page.click(selectors.onboarding.businessNext);

    await page.click(selectors.onboarding.workflowOption("excel"));
    await page.click(selectors.onboarding.workflowNext);

    await page.fill(selectors.onboarding.openingBalanceInput, "100");
    await page.click(selectors.onboarding.openingBalanceNext);

    await page.fill(selectors.onboarding.entryAmount, "12.50");
    await page.fill(selectors.onboarding.entryNote, "Income test");
    await page.click(selectors.onboarding.entrySubmit);
    await page.click(selectors.onboarding.entryType);
    await page.click(selectors.onboarding.entryTypeOption("expense"));
    await page.fill(selectors.onboarding.entryAmount, "4.00");
    await page.fill(selectors.onboarding.entryNote, "Expense test");
    await page.click(selectors.onboarding.entrySubmit);

    await page.setInputFiles(selectors.onboarding.receiptInput, invalidReceiptPath);
    await expect(page.locator(selectors.onboarding.receiptError)).toBeVisible();

    const [skipResponse] = await Promise.all([
      page.waitForResponse((response) => {
        if (!response.url().includes("/onboarding/cash-management-v1/step")) {
          return false;
        }
        if (response.request().method() !== "POST") {
          return false;
        }
        const data = response.request().postData();
        return Boolean(data && data.includes("first-receipt"));
      }),
      page.click(selectors.onboarding.receiptSkip),
    ]);
    expect([200, 201]).toContain(skipResponse.status());
    const skipPostData = skipResponse.request().postData();
    if (skipPostData) {
      const skipRequestPayload = JSON.parse(skipPostData) as { nextStepId?: string };
      expect(skipRequestPayload.nextStepId).toBe("today-status");
    }
    const skipPayload = (await skipResponse.json()) as {
      progress?: { currentStepId?: string };
    };
    expect(skipPayload.progress?.currentStepId).toBe("today-status");

    const progressAfterSkip = await getOnboardingProgress(request, auth);
    expect(progressAfterSkip.progress?.currentStepId).toBe("today-status");
    expect(progressAfterSkip.progress?.steps["first-receipt"]?.status).toBe("skipped");
  });

  test("persists Vietnamese language selection", async ({ page, request, testData }) => {
    const auth = await loginAsSeededUser(request, testData);
    await primeAuthenticatedSession(page, {
      accessToken: auth.accessToken,
      workspaceId: auth.workspaceId,
    });

    await page.goto("/onboarding/cash-management");
    await page.click(selectors.onboarding.welcomeNext);
    await page.click(selectors.onboarding.languageOption("vi"));
    await page.click(selectors.onboarding.languageNext);

    await expect(page.locator(selectors.onboarding.stepContainer)).toHaveAttribute(
      "data-step-id",
      "business-basics"
    );
    await expect(page.locator(selectors.onboarding.stepTitle)).toContainText(
      "Về doanh nghiệp của bạn"
    );
  });
});
