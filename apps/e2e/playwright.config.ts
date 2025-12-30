import { defineConfig, devices } from "@playwright/test";

const isCI = !!process.env.CI;
const baseURL = process.env.BASE_URL || "http://localhost:5173";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 1 : undefined,
  reporter: [
    ["html"],
    ["json", { outputFile: "test-results/results.json" }],
    ["junit", { outputFile: "test-results/junit.xml" }],
  ],

  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
  ],

  webServer: [
    {
      command: "pnpm --filter @corely/web dev --host 0.0.0.0 --port 5173",
      url: baseURL,
      reuseExistingServer: !isCI,
      timeout: 60_000,
    },
  ],

  globalSetup: "./utils/globalSetup.ts",
  timeout: 60_000,
});
