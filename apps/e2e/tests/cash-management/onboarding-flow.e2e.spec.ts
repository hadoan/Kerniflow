import path from "node:path";
import { test, expect } from "../fixtures.ts";
import { selectors } from "../../utils/selectors.ts";
import { loginAsSeededUser } from "../helpers/auth.ts";
import {
  completeOnboarding,
  getOnboardingProgress,
  primeAuthenticatedSession,
} from "../helpers/onboarding-helper.ts";

const receiptPath = path.resolve(process.cwd(), "fixtures/receipt-sample.jpg");

test.describe("Cash management onboarding - happy path", () => {
  test("completes the first-session onboarding journey", async ({ page, request, testData }) => {
    const auth = await loginAsSeededUser(request, testData);
    await primeAuthenticatedSession(page, {
      accessToken: auth.accessToken,
      workspaceId: auth.workspaceId,
    });

    await page.goto("/onboarding/cash-management");
    await expect(page.locator(selectors.onboarding.shell)).toBeVisible();

    await page.click(selectors.onboarding.welcomeNext);

    await page.click(selectors.onboarding.languageOption("en"));
    await page.click(selectors.onboarding.languageNext);

    await page.fill(selectors.onboarding.businessName, "Lotus Nails Berlin");
    await page.click(selectors.onboarding.businessCategory);
    await page.click(selectors.onboarding.businessCategoryOption("beauty"));
    await page.click(selectors.onboarding.businessCurrency);
    await page.click(selectors.onboarding.businessCurrencyOption("EUR"));
    await page.click(selectors.onboarding.businessNext);

    await expect(
      page.locator(selectors.onboarding.checklistItem("business-setup"))
    ).toHaveAttribute("data-status", "completed");

    await page.click(selectors.onboarding.workflowOption("paper"));
    await page.click(selectors.onboarding.workflowNext);

    await page.fill(selectors.onboarding.openingBalanceInput, "200.00");
    await page.click(selectors.onboarding.openingBalanceNext);

    await expect(page.locator(selectors.onboarding.stepContainer)).toHaveAttribute(
      "data-step-id",
      "first-entries"
    );

    await expect
      .poll(async () => {
        const progressAfterOpening = await getOnboardingProgress(request, auth);
        return progressAfterOpening.progress?.steps["opening-balance"]?.answers
          ?.openingBalanceCents;
      })
      .toBe(20000);

    await page.fill(selectors.onboarding.entryAmount, "25.50");
    await page.fill(selectors.onboarding.entryNote, "Cash manicure sale");
    await page.click(selectors.onboarding.entrySubmit);

    await page.click(selectors.onboarding.entryType);
    await page.click(selectors.onboarding.entryTypeOption("expense"));
    await page.fill(selectors.onboarding.entryAmount, "8.20");
    await page.fill(selectors.onboarding.entryNote, "Coffee supplies");
    await page.click(selectors.onboarding.entrySubmit);

    await page.setInputFiles(selectors.onboarding.receiptInput, receiptPath);
    await expect(page.locator(selectors.onboarding.receiptSuccess)).toBeVisible();
    const [receiptAdvanceResponse] = await Promise.all([
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
      page.click(selectors.onboarding.receiptContinue),
    ]);
    expect([200, 201]).toContain(receiptAdvanceResponse.status());
    const receiptPostData = receiptAdvanceResponse.request().postData();
    if (receiptPostData) {
      const receiptPayload = JSON.parse(receiptPostData) as { nextStepId?: string };
      expect(receiptPayload.nextStepId).toBe("today-status");
    }
    const receiptAdvancePayload = (await receiptAdvanceResponse.json()) as {
      progress?: { currentStepId?: string };
    };
    expect(receiptAdvancePayload.progress?.currentStepId).toBe("today-status");

    const progressAfterReceipt = await getOnboardingProgress(request, auth);
    expect(progressAfterReceipt.progress?.currentStepId).toBe("today-status");
    expect(progressAfterReceipt.progress?.completedAt).toBeFalsy();
    await completeOnboarding(request, auth);

    await page.goto("/dashboard");
    await page.waitForURL("**/dashboard", { timeout: 15_000 });
  });
});
