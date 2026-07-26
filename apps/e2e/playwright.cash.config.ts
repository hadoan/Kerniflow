import { defineConfig, devices } from "@playwright/test";

const isCI = !!process.env.CI;
const port = Number(process.env.CASH_E2E_PORT ?? 18085);
const baseURL = process.env.CASH_BASE_URL ?? `http://localhost:${port}`;

export default defineConfig({
  testDir: "./tests/cash-management",
  fullyParallel: false,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: 1,
  reporter: [
    ["html"],
    ["json", { outputFile: "test-results/cash-results.json" }],
    ["junit", { outputFile: "test-results/cash-junit.xml" }],
  ],
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "cash-chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "cash-mobile",
      use: { ...devices["iPhone 13"] },
    },
  ],
  webServer: {
    command: `pnpm --filter @corely/cash-management dev --host 0.0.0.0 --port ${port}`,
    url: baseURL,
    reuseExistingServer: !isCI,
    timeout: 120_000,
  },
  globalSetup: "./utils/globalSetup.ts",
  timeout: 90_000,
});
