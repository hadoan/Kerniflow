import { expect, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { test } from "../fixtures.ts";
import { selectors } from "../../utils/selectors.ts";
import { loginAsSeededUser } from "../helpers/auth.ts";
import { createCashEntry, createCashRegister } from "../helpers/cash-management-fixtures.ts";
import { HttpClient } from "../helpers/http-client.ts";
import { idempotencyKey } from "../helpers/idempotency.ts";

const shouldCapture = process.env.CASH_CAPTURE_SCREENS === "true";

type ScreenCase = {
  name: string;
  path: string;
  waitForText: string;
  beforeCapture?: () => Promise<void>;
};

async function loginViaUi(
  page: Page,
  creds: {
    email: string;
    password: string;
  }
): Promise<void> {
  await page.context().clearCookies();
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.goto("/auth/login");
  await page.fill(selectors.auth.loginEmailInput, creds.email);
  await page.fill(selectors.auth.loginPasswordInput, creds.password);

  await Promise.all([
    page.waitForURL((url) => !url.pathname.startsWith("/auth/login"), { timeout: 20_000 }),
    page.click(selectors.auth.loginSubmitButton),
  ]);

  await expect
    .poll(async () => page.evaluate(() => localStorage.getItem("accessToken")))
    .not.toBeNull();
}

test.describe("Cash Management screenshots", () => {
  test.skip(!shouldCapture, "Set CASH_CAPTURE_SCREENS=true to run screenshot capture.");

  test("captures all cash-management screens", async ({ page, request, testData }, testInfo) => {
    const auth = await loginAsSeededUser(request, testData);
    const client = new HttpClient(request, auth);
    const dayKey = "2026-02-27";
    const occurredAt = `${dayKey}T09:00:00.000Z`;
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const screenshotDir = join(process.cwd(), "output", "cash-management-screenshots", stamp);
    mkdirSync(screenshotDir, { recursive: true });

    const register = await createCashRegister(
      client,
      {
        name: "Cash Screens Register",
        location: "Front Desk",
        currency: "EUR",
      },
      idempotencyKey(testInfo, "screens-register")
    );

    await createCashEntry(
      client,
      register.register.id,
      {
        type: "SALE_CASH",
        direction: "IN",
        source: "MANUAL",
        paymentMethod: "CASH",
        description: "Seed entry for screenshots",
        amount: 120,
        occurredAt,
      },
      idempotencyKey(testInfo, "screens-entry")
    );

    await loginViaUi(page, {
      email: testData.user.email,
      password: testData.user.password,
    });

    const screens: ScreenCase[] = [
      {
        name: "01-registers-list",
        path: "/cash/registers",
        waitForText: "Cash Registers",
      },
      {
        name: "02-register-new",
        path: "/cash/registers/new",
        waitForText: "New cash register",
      },
      {
        name: "03-register-detail-overview",
        path: `/cash/registers/${register.register.id}`,
        waitForText: register.register.name,
      },
      {
        name: "04-register-detail-activity",
        path: `/cash/registers/${register.register.id}`,
        waitForText: "Activity / Audit",
        beforeCapture: async () => {
          await page.getByRole("tab", { name: "Activity / Audit" }).click();
          await expect(page.getByText("Use the", { exact: false })).toBeVisible();
        },
      },
      {
        name: "05-register-edit",
        path: `/cash/registers/${register.register.id}/edit`,
        waitForText: "Edit cash register",
      },
      {
        name: "06-entries-list",
        path: `/cash/registers/${register.register.id}/entries`,
        waitForText: "Entries",
      },
      {
        name: "07-day-close",
        path: `/cash/registers/${register.register.id}/day-close?day=${dayKey}`,
        waitForText: "Day close (Kassensturz)",
      },
      {
        name: "08-exports",
        path: `/cash/registers/${register.register.id}/exports`,
        waitForText: "Generate cashbook export",
      },
    ];

    for (const screen of screens) {
      await page.goto(screen.path);
      await expect(page.getByText(screen.waitForText, { exact: false }).first()).toBeVisible({
        timeout: 20_000,
      });
      await screen.beforeCapture?.();
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(200);
      await page.screenshot({
        path: join(screenshotDir, `${screen.name}.png`),
        fullPage: true,
      });
    }

    console.log(`Cash management screenshots saved to ${screenshotDir}`);
  });
});
