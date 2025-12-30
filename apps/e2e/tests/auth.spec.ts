import { test, expect } from "./fixtures";
import { selectors } from "../utils/selectors";

test.describe("Authentication", () => {
  test("should login and display user in menu", async ({ page, testData }) => {
    // Clear any existing session
    await page.context().clearCookies();
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.goto("/auth/login");

    await page.fill(selectors.auth.loginEmailInput, testData.user.email);
    await page.fill(selectors.auth.loginPasswordInput, testData.user.password);
    await page.click(selectors.auth.loginSubmitButton);

    await page.waitForURL("**/dashboard", { timeout: 10_000 });

    const userMenuButton = page.locator(selectors.auth.userMenuButton).first();
    await expect(userMenuButton).toBeVisible();
    await userMenuButton.click();

    const userMenu = page.locator(selectors.auth.userMenu).first();
    await expect(userMenu).toContainText(testData.user.email);
  });

  test("should display tenant name in navigation", async ({ page, testData }) => {
    // Clear any existing session
    await page.context().clearCookies();
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.goto("/auth/login");

    await page.fill(selectors.auth.loginEmailInput, testData.user.email);
    await page.fill(selectors.auth.loginPasswordInput, testData.user.password);
    await page.click(selectors.auth.loginSubmitButton);

    await page.waitForURL("**/dashboard", { timeout: 10_000 });
    await page.waitForLoadState("networkidle");

    const sidebar = page.locator(selectors.navigation.sidebarNav);
    await expect(sidebar).toBeVisible();

    const pageContent = await page.content();
    expect(pageContent).toContain(testData.tenant.name);
  });

  test("should redirect to login when accessing protected page", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/dashboard");

    await page.waitForURL("**/auth/login", { timeout: 10_000 });
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test("should signup and create workspace", async ({ page }) => {
    // Clear any existing session
    await page.context().clearCookies();
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());

    // Navigate to signup page
    await page.goto("/auth/signup");

    // Generate unique test credentials
    const timestamp = Date.now();
    const testEmail = `e2e-signup-${timestamp}@corely.local`;
    const testPassword = "SignupTest123!";
    const testName = "E2E Test User";
    const testWorkspace = `E2E Test Workspace ${timestamp}`;

    // Fill signup form
    await page.fill(selectors.auth.signupEmailInput, testEmail);
    await page.fill(selectors.auth.signupPasswordInput, testPassword);
    await page.fill(selectors.auth.signupNameInput, testName);
    await page.fill(selectors.auth.signupWorkspaceInput, testWorkspace);

    // Submit signup form
    await page.click(selectors.auth.signupSubmitButton);

    // Wait for redirect to onboarding or dashboard
    await page.waitForURL(/\/(onboarding|dashboard)/, { timeout: 10_000 });

    // Verify user is authenticated by checking for user menu
    const userMenuButton = page.locator(selectors.auth.userMenuButton).first();
    await expect(userMenuButton).toBeVisible({ timeout: 10_000 });
  });
});
