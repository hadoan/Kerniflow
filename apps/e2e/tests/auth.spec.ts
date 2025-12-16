import { test, expect } from "./fixtures";
import { selectors } from "../utils/selectors";

test.describe("Authentication", () => {
  test("should login and display user in menu", async ({ page, testData }) => {
    // Navigate to login page
    await page.goto("/auth/login");

    // Fill login form
    await page.fill(selectors.auth.loginEmailInput, testData.user.email);
    await page.fill(selectors.auth.loginPasswordInput, testData.user.password);
    await page.click(selectors.auth.loginSubmitButton);

    // Wait for redirect to dashboard
    await page.waitForURL("**/dashboard", { timeout: 10_000 });

    // Verify user menu shows the correct user
    const userMenuButton = await page.locator(selectors.auth.userMenuButton);
    await expect(userMenuButton).toBeVisible();
    await userMenuButton.click();

    // Check if user name or email is displayed in the menu
    const userMenu = await page.locator(selectors.auth.userMenu);
    await expect(userMenu).toContainText(testData.user.email);
  });

  test("should display tenant name in navigation", async ({ page, testData }) => {
    // Navigate to dashboard (assuming user is already logged in via globalSetup)
    await page.goto("/dashboard");

    // Wait for page to load
    await page.waitForLoadState("networkidle");

    // Verify sidebar is visible
    const sidebar = page.locator(selectors.navigation.sidebarNav);
    await expect(sidebar).toBeVisible();

    // Check for tenant name (may be in sidebar or header)
    // This assumes tenant name appears somewhere in the UI
    const pageContent = await page.content();
    expect(pageContent).toContain(testData.tenant.name);
  });

  test("should redirect to login when accessing protected page", async ({ page }) => {
    // Clear cookies to simulate logged-out state
    await page.context().clearCookies();

    // Try to access dashboard
    await page.goto("/dashboard");

    // Should redirect to login
    await page.waitForURL("**/auth/login", { timeout: 10_000 });
    await expect(page).toHaveURL(/\/auth\/login/);
  });
});
