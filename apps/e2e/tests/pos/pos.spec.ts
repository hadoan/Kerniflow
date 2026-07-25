import { test, expect } from "@playwright/test";
import {
  autoAcceptNativeDialogs,
  bootstrapAuthenticatedPos,
  openShiftFromGuard,
  installPosApiMock,
  selectRegister,
} from "./helpers.ts";

test.describe("POS app", () => {
  test("shows register and shift guard flow", async ({ page }) => {
    autoAcceptNativeDialogs(page);
    await installPosApiMock(page);

    await bootstrapAuthenticatedPos(page);
    await selectRegister(page);
    await openShiftFromGuard(page);

    await expect(page.getByTestId("pos-shift-open-screen")).toBeVisible();
  });

  test("shows sell screen and empty cart state for authenticated cashier", async ({ page }) => {
    autoAcceptNativeDialogs(page);
    await installPosApiMock(page, { startWithOpenShift: true });

    await bootstrapAuthenticatedPos(page, { requireOpenShiftForSales: false });

    await selectRegister(page);
    await expect(page.getByTestId("pos-home-screen")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("pos-home-search-input")).toBeVisible({ timeout: 20_000 });

    await page.goto("/cart");
    await expect(page.getByTestId("pos-cart-empty")).toBeVisible({ timeout: 20_000 });
  });

  test("shows sync dashboard controls and stats", async ({ page }) => {
    autoAcceptNativeDialogs(page);
    await installPosApiMock(page, { startWithOpenShift: true });

    await bootstrapAuthenticatedPos(page, { requireOpenShiftForSales: false });
    await selectRegister(page);
    await expect(page.getByTestId("pos-home-screen")).toBeVisible({ timeout: 20_000 });

    await page.goto("/sync");
    await expect(page.getByTestId("pos-sync-title")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("pos-sync-stat-pending")).toBeVisible();
    await expect(page.getByTestId("pos-sync-sync-now")).toBeVisible();
    await expect(page.getByTestId("pos-sync-retry-failed")).toBeVisible();
    await expect(page.getByTestId("pos-sync-export-logs")).toBeVisible();
  });

  test("logs out from settings on web", async ({ page }) => {
    autoAcceptNativeDialogs(page);
    await installPosApiMock(page, { startWithOpenShift: true });

    await bootstrapAuthenticatedPos(page, { requireOpenShiftForSales: false });
    await selectRegister(page);
    await expect(page.getByTestId("pos-home-screen")).toBeVisible({ timeout: 20_000 });

    await page.goto("/settings");
    await expect(page.getByTestId("pos-settings-screen")).toBeVisible({ timeout: 20_000 });
    await page.getByRole("button", { name: /logout/i }).click();

    await expect(page).toHaveURL(/\/login$/, { timeout: 20_000 });
  });
});
