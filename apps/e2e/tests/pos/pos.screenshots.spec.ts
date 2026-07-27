import { expect, test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { POS_AUTH_TOKENS, POS_IDS, installPosApiMock } from "./helpers.ts";

const shouldCapture = process.env.POS_CAPTURE_SCREENS === "true";
const baseURL =
  process.env.POS_BASE_URL ?? `http://localhost:${process.env.POS_E2E_PORT ?? "18084"}`;

type WaitFor =
  | { type: "testId"; value: string }
  | { type: "text"; value: string }
  | { type: "timeout"; value: number };

type ScreenCase = {
  name: string;
  route: string;
  authenticated?: boolean;
  selectedRegister?: boolean;
  requireOpenShiftForSales?: boolean;
  startWithOpenShift?: boolean;
  waitFor: WaitFor;
};

const SCREENS: ScreenCase[] = [
  {
    name: "01-login",
    route: "/login",
    authenticated: false,
    waitFor: { type: "testId", value: "pos-login-screen" },
  },
  {
    name: "02-home-no-register-guard",
    route: "/",
    selectedRegister: false,
    requireOpenShiftForSales: true,
    waitFor: { type: "testId", value: "pos-home-guard-no-register" },
  },
  {
    name: "03-register-selection",
    route: "/register-selection",
    selectedRegister: false,
    requireOpenShiftForSales: true,
    waitFor: { type: "testId", value: "pos-register-selection-screen" },
  },
  {
    name: "04-home-open-shift-guard",
    route: "/",
    selectedRegister: true,
    requireOpenShiftForSales: true,
    waitFor: { type: "testId", value: "pos-home-guard-open-shift" },
  },
  {
    name: "05-shift-open",
    route: "/shift/open",
    selectedRegister: true,
    requireOpenShiftForSales: true,
    waitFor: { type: "testId", value: "pos-shift-open-screen" },
  },
  {
    name: "06-home-main",
    route: "/",
    selectedRegister: true,
    requireOpenShiftForSales: false,
    waitFor: { type: "testId", value: "pos-home-screen" },
  },
  {
    name: "07-cart-empty",
    route: "/cart",
    selectedRegister: true,
    requireOpenShiftForSales: false,
    waitFor: { type: "testId", value: "pos-cart-empty" },
  },
  {
    name: "08-checkout",
    route: "/checkout",
    selectedRegister: true,
    requireOpenShiftForSales: false,
    waitFor: { type: "testId", value: "pos-checkout-screen" },
  },
  {
    name: "09-receipt",
    route: "/receipt?saleId=6506f85a-ad10-45ac-a856-8d72c88b2b35",
    selectedRegister: true,
    requireOpenShiftForSales: false,
    waitFor: { type: "timeout", value: 1800 },
  },
  {
    name: "10-sync",
    route: "/sync",
    selectedRegister: true,
    requireOpenShiftForSales: false,
    waitFor: { type: "testId", value: "pos-sync-screen" },
  },
  {
    name: "11-settings",
    route: "/settings",
    selectedRegister: true,
    requireOpenShiftForSales: false,
    waitFor: { type: "testId", value: "pos-settings-screen" },
  },
  {
    name: "12-scanner",
    route: "/scanner",
    selectedRegister: true,
    requireOpenShiftForSales: false,
    waitFor: { type: "text", value: "Scan Barcode" },
  },
  {
    name: "13-shift-close",
    route: "/shift/close",
    selectedRegister: true,
    requireOpenShiftForSales: false,
    waitFor: { type: "text", value: "No active shift" },
  },
  {
    name: "14-kiosk-home",
    route: "/kiosk",
    selectedRegister: true,
    requireOpenShiftForSales: false,
    waitFor: { type: "text", value: "Corely Check-In" },
  },
  {
    name: "15-kiosk-scan",
    route: "/kiosk/scan",
    selectedRegister: true,
    requireOpenShiftForSales: false,
    waitFor: { type: "text", value: "Scan QR" },
  },
  {
    name: "16-kiosk-lookup",
    route: "/kiosk/lookup",
    selectedRegister: true,
    requireOpenShiftForSales: false,
    waitFor: { type: "text", value: "Find Customer" },
  },
  {
    name: "17-kiosk-today",
    route: "/kiosk/today",
    selectedRegister: true,
    requireOpenShiftForSales: false,
    waitFor: { type: "text", value: "Today’s Check-Ins" },
  },
  {
    name: "18-kiosk-customer",
    route: `/kiosk/customer?customerId=${POS_IDS.customerId}`,
    selectedRegister: true,
    requireOpenShiftForSales: false,
    waitFor: { type: "text", value: "Customer Profile" },
  },
  {
    name: "19-kiosk-confirm",
    route: `/kiosk/confirm?customerId=${POS_IDS.customerId}`,
    selectedRegister: true,
    requireOpenShiftForSales: false,
    waitFor: { type: "text", value: "Confirm Check-In" },
  },
  {
    name: "20-kiosk-success",
    route: "/kiosk/success?points=15",
    selectedRegister: true,
    requireOpenShiftForSales: false,
    waitFor: { type: "text", value: "Checked In!" },
  },
  {
    name: "21-kiosk-rewards",
    route: "/kiosk/rewards",
    selectedRegister: true,
    requireOpenShiftForSales: false,
    waitFor: { type: "text", value: "Rewards" },
  },
];

function seedStorage(input: {
  authenticated: boolean;
  selectedRegister: boolean;
  requireOpenShiftForSales: boolean;
  ids: typeof POS_IDS;
  tokens: typeof POS_AUTH_TOKENS;
}): void {
  const { authenticated, selectedRegister, requireOpenShiftForSales, ids, tokens } = input;
  const prefix = "corely-pos.secure.";
  const set = (key: string, value: string) => localStorage.setItem(`${prefix}${key}`, value);

  localStorage.clear();
  if (!authenticated) {
    return;
  }

  set("accessToken", tokens.accessToken);
  set("refreshToken", tokens.refreshToken);
  set("activeWorkspaceId", ids.workspaceId);
  set("pos.require-open-shift-for-sales", requireOpenShiftForSales ? "true" : "false");
  if (selectedRegister) {
    set("pos-selected-register", ids.registerId);
  }
  set(
    "user",
    JSON.stringify({
      userId: ids.userId,
      workspaceId: ids.workspaceId,
      email: "cashier@corely.test",
    })
  );
}

async function waitForScreen(page: Page, waitFor: WaitFor): Promise<void> {
  if (waitFor.type === "testId") {
    await expect(page.getByTestId(waitFor.value)).toBeVisible({ timeout: 20_000 });
    return;
  }

  if (waitFor.type === "text") {
    await expect(page.getByText(waitFor.value).first()).toBeVisible({ timeout: 20_000 });
    return;
  }

  await page.waitForTimeout(waitFor.value);
}

test.describe("POS screenshots", () => {
  test.skip(!shouldCapture, "Set POS_CAPTURE_SCREENS=true to run screenshot capture.");

  test("captures all POS screens", async ({ browser }) => {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const screenshotDir = join(process.cwd(), "output", "pos-screenshots", stamp);
    mkdirSync(screenshotDir, { recursive: true });

    for (const screen of SCREENS) {
      const context = await browser.newContext({
        viewport: { width: 1366, height: 900 },
      });
      const page = await context.newPage();

      await installPosApiMock(page, {
        startWithOpenShift: screen.startWithOpenShift ?? false,
      });

      await page.addInitScript(seedStorage, {
        authenticated: screen.authenticated !== false,
        selectedRegister: screen.selectedRegister === true,
        requireOpenShiftForSales: screen.requireOpenShiftForSales ?? true,
        ids: POS_IDS,
        tokens: POS_AUTH_TOKENS,
      });

      await page.goto(new URL(screen.route, baseURL).toString());
      await waitForScreen(page, screen.waitFor);
      await page.waitForTimeout(250);
      await page.screenshot({
        path: join(screenshotDir, `${screen.name}.png`),
        fullPage: true,
      });

      await context.close();
    }

    console.log(`POS screenshots saved to ${screenshotDir}`);
  });
});
