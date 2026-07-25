import { test, expect } from "../fixtures.ts";
import { selectors } from "../../utils/selectors.ts";
import { loginAsSeededUser } from "../helpers/auth.ts";
import { primeAuthenticatedSession } from "../helpers/onboarding-helper.ts";

test.describe("Cash management onboarding - AI helper", () => {
  test("opens the assistant from the onboarding helper", async ({ page, request, testData }) => {
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
    await page.click(selectors.onboarding.workflowOption("paper"));
    await page.click(selectors.onboarding.workflowNext);

    await expect(page.locator(selectors.onboarding.aiHelper)).toBeVisible();
    await page.click(selectors.onboarding.aiHelperOpen);

    await expect(page).toHaveURL(/\/assistant/);
    await expect(page.locator(selectors.assistant.chatContainer)).toBeVisible({ timeout: 15_000 });
  });
});
