import { test, expect } from "../fixtures.ts";
import { selectors } from "../../utils/selectors.ts";
import { seedPlatformTenants } from "../../utils/testData.ts";

test.describe("Manual Tenant Plan Update", () => {
  let testTenants: Array<{ id: string; name: string }> = [];

  test.beforeEach(async ({ page, hostAdminData }) => {
    // 1. Seed some tenants to show in the list
    testTenants = await seedPlatformTenants(2);

    // 2. Login as Host Admin
    await page.goto("/auth/login");
    await page.fill(selectors.auth.loginEmailInput, hostAdminData.user.email);
    await page.fill(selectors.auth.loginPasswordInput, hostAdminData.user.password);
    await page.click(selectors.auth.loginSubmitButton);

    // 3. Wait for dashboard and verify no tenant scope (Host Scope)
    await page.waitForURL("**/dashboard", { timeout: 10_000 });

    // 4. Navigate to Tenant Management
    await page.goto("/settings/tenants");
    await page.waitForURL("**/settings/tenants**", { timeout: 10_000 });
  });

  test("Happy Path: Host admin can manually update a tenant plan", async ({ page }) => {
    const targetTenant = testTenants[0];
    const rowSelector = selectors.platformTenants.row(targetTenant.id);
    const planCellSelector = selectors.platformTenants.planCell(targetTenant.id);

    // Verify initial state
    await expect(page.locator(rowSelector)).toBeVisible();
    await expect(page.locator(planCellSelector)).toContainText("free", { ignoreCase: true });

    // Open Plan Modal
    await page.click(selectors.platformTenants.managePlanButton(targetTenant.id));
    await expect(page.locator(selectors.platformTenants.modal)).toBeVisible();

    // Update Plan to Pro
    await page.click(selectors.platformTenants.planSelect);
    await page.click(selectors.platformTenants.planOption("pro"));

    // Update Status to Trial
    await page.click(selectors.platformTenants.planStatusSelect);
    await page.click(selectors.platformTenants.planStatusOption("trial"));

    // Update Billing Method to Bank Transfer
    await page.click(selectors.platformTenants.billingMethodSelect);
    await page.click(selectors.platformTenants.billingMethodOption("bank_transfer"));

    // Add Note
    const testNote = `E2E Test Note ${Date.now()}`;
    await page.fill(selectors.platformTenants.noteInput, testNote);

    // Save
    await page.click(selectors.platformTenants.saveButton);

    // Modal should close
    await expect(page.locator(selectors.platformTenants.modal)).not.toBeVisible();

    // Verify update in the table
    const cell = page.locator(planCellSelector);
    await expect(cell).toContainText("pro", { ignoreCase: true });
    await expect(cell).toContainText("trial", { ignoreCase: true });
    await expect(cell).toContainText("bank_transfer", { ignoreCase: true });

    // Verify persistence after reload
    await page.reload();
    await page.waitForURL("**/settings/tenants**");
    await expect(page.locator(planCellSelector)).toContainText("pro", { ignoreCase: true });
    // Note is internal/modal only usually, but let's check it's still in the modal
    await page.click(selectors.platformTenants.managePlanButton(targetTenant.id));
    await expect(page.locator(selectors.platformTenants.noteInput)).toHaveValue(testNote);
  });

  test("Permission Protection: Normal user cannot see or access tenant management", async ({
    page,
    testData,
  }) => {
    // Logout from host admin (clearing cookies is enough in Playwright tests as they start fresh)
    await page.context().clearCookies();
    await page.evaluate(() => localStorage.clear());

    // Login as normal tenant owner
    await page.goto("/auth/login");
    await page.fill(selectors.auth.loginEmailInput, testData.user.email);
    await page.fill(selectors.auth.loginPasswordInput, testData.user.password);
    await page.click(selectors.auth.loginSubmitButton);
    await page.waitForURL("**/dashboard");

    // Attempt to navigate to tenant management
    await page.goto("/settings/tenants");

    // Should be redirected or show permission denied (depending on implementation - usually redirects to dashboard or 403)
    // The RequirePermission component usually hides the page.
    // In our routes, /settings/tenants is wrapped with platform.tenants.read

    // Check for "Access Denied" or redirect
    const url = page.url();
    if (url.includes("/settings/tenants")) {
      // If still on the page, check if content is empty or shows error
      // Based on Corely patterns, it might show a 403 or just stay on dashboard
      const bodyText = await page.innerText("body");
      expect(bodyText).not.toContain("Tenants"); // Should not show the tenant list page title
    }
  });

  test("Downgrade Scenario: Verify modal states when changing plan", async ({ page }) => {
    const targetTenant = testTenants[1];

    // Set to Pro first
    await page.click(selectors.platformTenants.managePlanButton(targetTenant.id));
    await page.click(selectors.platformTenants.planSelect);
    await page.click(selectors.platformTenants.planOption("pro"));
    await page.click(selectors.platformTenants.saveButton);
    await expect(page.locator(selectors.platformTenants.modal)).not.toBeVisible();

    // Re-open and try to set to Free
    await page.click(selectors.platformTenants.managePlanButton(targetTenant.id));
    await page.click(selectors.platformTenants.planSelect);
    await page.click(selectors.platformTenants.planOption("free"));

    // Currently we don't have a special downgrade warning implementation in the UI code I wrote (it's a simple form)
    // But we should verify it saves correctly.
    await page.click(selectors.platformTenants.saveButton);
    await expect(page.locator(selectors.platformTenants.planCell(targetTenant.id))).toContainText(
      "free",
      { ignoreCase: true }
    );
  });
});
