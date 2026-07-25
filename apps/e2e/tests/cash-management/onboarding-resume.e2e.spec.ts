import { test, expect } from "../fixtures.ts";
import { selectors } from "../../utils/selectors.ts";
import { loginAsSeededUser } from "../helpers/auth.ts";
import {
  completeOnboarding,
  getOnboardingProgress,
  primeAuthenticatedSession,
  upsertOnboardingStep,
} from "../helpers/onboarding-helper.ts";

test.describe("Cash management onboarding - resume and checklist", () => {
  test("resumes at the correct step after interruption", async ({ page, request, testData }) => {
    const auth = await loginAsSeededUser(request, testData);
    await primeAuthenticatedSession(page, {
      accessToken: auth.accessToken,
      workspaceId: auth.workspaceId,
    });

    await page.goto("/onboarding/cash-management");
    await page.click(selectors.onboarding.welcomeNext);

    await page.click(selectors.onboarding.languageOption("de"));
    await page.click(selectors.onboarding.languageNext);

    await expect(page.locator(selectors.onboarding.stepContainer)).toHaveAttribute(
      "data-step-id",
      "business-basics"
    );
    await expect
      .poll(async () => {
        const progress = await getOnboardingProgress(request, auth);
        return progress.progress?.locale;
      })
      .toBe("de");

    await page.reload();

    await expect(page.locator(selectors.onboarding.stepTitle)).toContainText(
      "Über Ihr Unternehmen"
    );
    await expect(page.locator(selectors.onboarding.stepContainer)).toHaveAttribute(
      "data-step-id",
      "business-basics"
    );
  });

  test("checklist deep-links to the resume route", async ({ page, request, testData }) => {
    const auth = await loginAsSeededUser(request, testData);
    await primeAuthenticatedSession(page, {
      accessToken: auth.accessToken,
      workspaceId: auth.workspaceId,
    });

    await page.goto("/onboarding/cash-management");
    await page.click(selectors.onboarding.welcomeNext);
    await page.click(selectors.onboarding.languageOption("en"));
    await page.click(selectors.onboarding.languageNext);
    await page.fill(selectors.onboarding.businessName, "Lotus Nails");
    await page.click(selectors.onboarding.businessCategory);
    await page.click(selectors.onboarding.businessCategoryOption("beauty"));
    await page.click(selectors.onboarding.businessCurrency);
    await page.click(selectors.onboarding.businessCurrencyOption("EUR"));
    await page.click(selectors.onboarding.businessNext);

    const openingChecklist = page.locator(selectors.onboarding.checklistAction("opening-balance"));
    await expect(openingChecklist).toBeVisible();
    await openingChecklist.click();
    await expect(page).toHaveURL(/\/onboarding\/cash-management\/resume/);
  });

  test("already-onboarded users are not redirected back to onboarding", async ({
    page,
    request,
    testData,
  }) => {
    const auth = await loginAsSeededUser(request, testData);
    await upsertOnboardingStep(request, auth, {
      stepId: "welcome",
      status: "completed",
      nextStepId: "language",
    });
    await completeOnboarding(request, auth);
    await primeAuthenticatedSession(page, {
      accessToken: auth.accessToken,
      workspaceId: auth.workspaceId,
    });

    await page.goto("/dashboard");
    await page.waitForURL("**/dashboard", { timeout: 10_000 });
    await page.waitForTimeout(1500);
    await expect(page).not.toHaveURL(/\/onboarding/);
  });
});
