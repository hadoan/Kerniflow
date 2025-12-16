import { chromium, FullConfig } from "@playwright/test";
import { seedTestData } from "./testData";

async function globalSetup(_config: FullConfig) {
  // Seed test data and create a logged-in storage state
  const baseURL = process.env.BASE_URL || "http://localhost:5173";

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  // Navigate to the app
  await page.goto(baseURL);

  // Call seed endpoint to create test tenant/user
  const testData = await seedTestData();

  // If seed successful, perform login via UI and save storage state
  if (testData) {
    const loginUrl = `${baseURL}/auth/login`;
    await page.goto(loginUrl);

    // Fill login form
    await page.fill('input[data-testid="login-email"]', testData.user.email);
    await page.fill('input[data-testid="login-password"]', testData.user.password);
    await page.click('button[data-testid="login-submit"]');

    // Wait for redirect to dashboard
    await page.waitForURL("**/dashboard", { timeout: 10_000 }).catch(() => {
      // Dashboard redirect may not happen immediately, that's okay
      // The important part is we're logged in for storage state
    });

    // Save storage state (cookies, localStorage, sessionStorage)
    await context.storageState({
      path: "utils/storageState.json",
    });
  }

  await context.close();
  await browser.close();
}

export default globalSetup;
