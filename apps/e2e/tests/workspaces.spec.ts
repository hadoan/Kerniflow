import { test, expect } from "./fixtures";
import { selectors } from "../utils/selectors";

const mockWorkspaceA = {
  id: "ws-1",
  name: "Corely GmbH",
  kind: "COMPANY",
  legalName: "Corely GmbH",
  countryCode: "DE",
  currency: "EUR",
  onboardingStatus: "DONE",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const mockWorkspaceB = {
  id: "ws-2",
  name: "Second Studio",
  kind: "PERSONAL",
  legalName: "Second Studio",
  countryCode: "US",
  currency: "USD",
  onboardingStatus: "DONE",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

test.describe("Workspaces UI", () => {
  test("shows workspace switcher and switches active workspace", async ({ page, testData }) => {
    await page.route("**/workspaces", async (route) => {
      if (route.request().method() === "GET") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ workspaces: [mockWorkspaceA, mockWorkspaceB] }),
        });
      }
      return route.continue();
    });

    await page.goto("/auth/login");
    await page.fill(selectors.auth.loginEmailInput, testData.user.email);
    await page.fill(selectors.auth.loginPasswordInput, testData.user.password);
    await page.click(selectors.auth.loginSubmitButton);
    await page.waitForURL("**/dashboard", { timeout: 10_000 });

    const switcher = page.locator(selectors.workspace.switcherTrigger);
    await expect(switcher).toContainText("Corely GmbH");

    await switcher.click();
    await page.click(selectors.workspace.option("ws-2"));
    await expect(page.locator(selectors.workspace.switcherTrigger)).toContainText("Second Studio");
  });

  test("redirects to onboarding when no workspaces and creates one", async ({ page, testData }) => {
    let created = false;
    const createdWorkspace = { ...mockWorkspaceA, id: "ws-new", name: "New Workspace" };

    await page.route("**/workspaces", async (route) => {
      const method = route.request().method();
      if (method === "GET") {
        const body = created ? { workspaces: [createdWorkspace] } : { workspaces: [] };
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(body),
        });
      }

      if (method === "POST") {
        created = true;
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            workspace: createdWorkspace,
            membership: {
              id: "m-1",
              workspaceId: createdWorkspace.id,
              userId: testData.user.id,
              role: "OWNER",
              status: "ACTIVE",
              createdAt: new Date().toISOString(),
            },
          }),
        });
      }

      return route.continue();
    });

    await page.goto("/auth/login");
    await page.fill(selectors.auth.loginEmailInput, testData.user.email);
    await page.fill(selectors.auth.loginPasswordInput, testData.user.password);
    await page.click(selectors.auth.loginSubmitButton);

    await page.waitForURL("**/onboarding", { timeout: 10_000 });
    await expect(page).toHaveURL(/\/onboarding/);

    // Step 1
    await page.fill(selectors.workspace.onboardingName, "New Workspace");
    await page.click(selectors.workspace.onboardingNext);

    // Step 2
    await page.fill(selectors.workspace.onboardingLegalName, "New Workspace LLC");
    await page.fill(selectors.workspace.onboardingAddress, "123 Main St");
    await page.fill(selectors.workspace.onboardingCity, "Berlin");
    await page.fill(selectors.workspace.onboardingPostal, "10115");
    await page.click(selectors.workspace.onboardingNext);

    // Step 3
    await page.click(selectors.workspace.onboardingSubmit);

    await page.waitForURL("**/dashboard", { timeout: 10_000 });
    await expect(page.locator(selectors.workspace.switcherTrigger)).toContainText("New Workspace");
  });
});
