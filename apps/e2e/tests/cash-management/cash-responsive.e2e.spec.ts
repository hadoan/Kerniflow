import { expect, type Page } from "@playwright/test";
import { test } from "../fixtures.ts";
import { loginAsSeededUser } from "../helpers/auth.ts";
import { createCashRegister } from "../helpers/cash-management-fixtures.ts";
import { HttpClient } from "../helpers/http-client.ts";
import { idempotencyKey } from "../helpers/idempotency.ts";

const expectNoPageOverflow = async (page: Page) => {
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth
      )
    )
    .toBe(true);
};

const loginViaUi = async (page: Page, credentials: { email: string; password: string }) => {
  await page.goto("/auth/login");
  await page.getByTestId("login-email").fill(credentials.email);
  await page.getByTestId("login-password").fill(credentials.password);
  await Promise.all([
    page.waitForURL((url) => !url.pathname.startsWith("/auth/login")),
    page.getByTestId("login-submit").click(),
  ]);
};

test.describe("Cash Management responsive surfaces", () => {
  test("captures the registers list at the supported responsive widths", async ({
    page,
    request,
    testData,
  }, testInfo) => {
    const auth = await loginAsSeededUser(request, testData);
    const client = new HttpClient(request, auth);
    await createCashRegister(
      client,
      { name: "Kasse für Schönheitsstudio Nguyễn mit langem deutschem Namen", currency: "EUR" },
      idempotencyKey(testInfo, "responsive-screenshots")
    );
    await loginViaUi(page, testData.user);

    for (const [width, height] of [
      [320, 568],
      [390, 844],
      [430, 932],
      [768, 1024],
      [1440, 1000],
    ]) {
      await page.setViewportSize({ width, height });
      await page.goto("/cash/registers");
      await expect(page.getByRole("heading", { name: /cash registers/i })).toBeVisible();
      await expectNoPageOverflow(page);
      await page.screenshot({
        path: testInfo.outputPath(`registers-${width}.png`),
        fullPage: true,
      });
    }
  });

  test("mobile drawer is dismissible and has one footer", async ({
    page,
    request,
    testData,
  }, testInfo) => {
    const auth = await loginAsSeededUser(request, testData);
    const client = new HttpClient(request, auth);
    await page.setViewportSize({ width: 320, height: 568 });
    await loginViaUi(page, testData.user);
    await page.goto("/cash/registers");
    await page.getByRole("button", { name: /open navigation/i }).click();
    await expect(page.getByTestId("sidebar-nav-mobile")).toBeVisible();
    await expect(page.getByTestId("user-menu-trigger")).toHaveCount(1);
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("sidebar-nav-mobile")).not.toBeVisible();
    await expectNoPageOverflow(page);

    const register = await createCashRegister(
      client,
      {
        name: "Sehr langer vietnamesischer Kassenname cho tiệm làm móng ở Deutschland",
        location: "Berlin Mitte",
        currency: "EUR",
      },
      idempotencyKey(testInfo, "responsive-register")
    );
    await page.goto("/cash/registers");
    await expect(page.getByText(register.register.name)).toBeVisible();
    await expectNoPageOverflow(page);
  });

  test("cash entry sheet and assistant remain usable at phone widths", async ({
    page,
    request,
    testData,
  }, testInfo) => {
    const auth = await loginAsSeededUser(request, testData);
    const client = new HttpClient(request, auth);
    const register = await createCashRegister(
      client,
      { name: "Mobile register", currency: "EUR" },
      idempotencyKey(testInfo, "mobile-register")
    );
    await page.setViewportSize({ width: 390, height: 844 });
    await loginViaUi(page, testData.user);
    await page.goto(`/cash/registers/${register.register.id}/entries`);
    await page.getByRole("button", { name: /new cash entry/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("button", { name: /save/i })).toBeVisible();
    await expectNoPageOverflow(page);

    await page.getByRole("button", { name: /close/i }).click();
    await page.goto("/assistant");
    await expect(page.getByTestId("cash-assistant-message-input")).toBeVisible();
    await page
      .getByTestId("cash-assistant-message-input")
      .fill("Ghi giao dịch hôm nay\nmit einer sehr langen deutschen Nachricht");
    await expectNoPageOverflow(page);
  });
});
