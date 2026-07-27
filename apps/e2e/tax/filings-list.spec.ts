import type { Page } from "@playwright/test";
import { test, expect } from "../tests/fixtures.ts";
import {
  TAX_FILING_MATRIX,
  filingIdFromUrl,
  loginAsSeededUserUi,
} from "../tests/helpers/tax-fixtures.ts";

async function selectFilingType(page: Page, type: "vat" | "vat-annual") {
  await page.getByRole("combobox").first().click();
  if (type === "vat") {
    await page.getByRole("option", { name: /VAT Return/i }).click();
    return;
  }
  await page.getByRole("option", { name: /Annual VAT/i }).click();
}

test.describe("Tax Filings List", () => {
  test("shows loading state before list results render", async ({ page, testData }) => {
    await loginAsSeededUserUi(page, testData);

    let releaseFirstListRequest: () => void = () => undefined;
    let didHold = false;
    const holdPromise = new Promise<void>((resolve) => {
      releaseFirstListRequest = () => resolve();
    });

    await page.route("**/tax/filings?*", async (route) => {
      const request = route.request();
      const isApiListRequest =
        (request.resourceType() === "fetch" || request.resourceType() === "xhr") &&
        request.method() === "GET";
      if (!isApiListRequest) {
        await route.continue();
        return;
      }
      if (!didHold) {
        didHold = true;
        await holdPromise;
      }
      await route.continue();
    });

    await page.goto("/tax/filings?tab=income-annual");
    await expect(
      page.locator('[data-testid="tax-filings-list"] td.animate-pulse').first()
    ).toBeVisible();

    releaseFirstListRequest();
    await expect(page.locator('[data-testid="tax-filings-list"] td.animate-pulse')).toHaveCount(0);
  });

  test("shows empty and error list states", async ({ page, testData }) => {
    await loginAsSeededUserUi(page, testData);

    await page.goto("/tax/filings?tab=income-annual");
    await expect(page.getByText(/No annual filings found|No filings found/i)).toBeVisible();

    await page.route("**/tax/filings?*", async (route) => {
      const request = route.request();
      const isApiListRequest =
        (request.resourceType() === "fetch" || request.resourceType() === "xhr") &&
        request.method() === "GET";
      if (!isApiListRequest) {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({
          title: "Server error",
          detail: "Failed to load filings",
          status: 500,
        }),
      });
    });

    await page.goto("/tax/filings?tab=income-annual");
    const errorMessage = page.getByText(
      /Unable to load filings|Failed to load filings|Server error/i
    );
    await expect(errorMessage.first()).toBeVisible();
    await expect(page.getByRole("button", { name: /Retry/i })).toBeVisible();
  });

  test.describe("Create Filing Matrix", () => {
    test.describe.configure({ mode: "serial" });

    for (const scenario of TAX_FILING_MATRIX) {
      test(`creates ${scenario.filingType} filing via UI and lands on draft object page`, async ({
        page,
        testData,
      }) => {
        await loginAsSeededUserUi(page, testData);
        await page.goto("/tax/filings/new");

        await selectFilingType(page, scenario.taxApiType);
        const yearInput = page.locator('input[type="number"]').first();
        await yearInput.fill(String(scenario.year));

        if (scenario.taxApiType === "vat") {
          await page.getByRole("combobox").nth(1).click();
          const option = page.getByRole("option", { name: /Q1 2026/i });
          if ((await option.count()) > 0) {
            await option.first().click();
          } else {
            await page.getByPlaceholder("Search or type period…").fill(scenario.periodKey ?? "");
            await page.getByText(`Use "${scenario.periodKey}"`).click();
          }
        }

        const createResponsePromise = page.waitForResponse(
          (response) =>
            response.url().includes("/tax/filings") && response.request().method() === "POST"
        );
        await page.getByRole("button", { name: /Create Filing/i }).click();
        const createResponse = await createResponsePromise;
        expect(createResponse.ok()).toBeTruthy();

        await expect(page).toHaveURL(/\/tax\/filings\/[^/]+$/u);
        const filingId = filingIdFromUrl(page.url());
        expect(filingId.length).toBeGreaterThan(6);

        await expect(page.getByRole("heading", { level: 1 })).toContainText(scenario.expectedTitle);
        await expect(page.getByText("Draft")).toBeVisible();
      });
    }
  });
});
