import { test, expect } from "../tests/fixtures.ts";
import {
  loginAsSeededUserUi,
  resolveActiveWorkspaceId,
  seedTaxScenario,
} from "../tests/helpers/tax-fixtures.ts";

test.describe("Tax Payments", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/tax/capabilities", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          capabilities: {
            paymentsEnabled: true,
            strategy: {
              canFileVat: true,
              canPayVat: true,
              needsConsultant: false,
              supportsReverseCharge: true,
              supportsOss: false,
            },
          },
        }),
      });
    });
  });

  test("renders loading, empty, and error states", async ({ page, testData }) => {
    await loginAsSeededUserUi(page, testData);

    let releaseFirstRequest: () => void = () => undefined;
    let didPause = false;
    const pause = new Promise<void>((resolve) => {
      releaseFirstRequest = () => resolve();
    });

    await page.route("**/tax/payments?*", async (route) => {
      if (!didPause) {
        didPause = true;
        await pause;
      }
      await route.continue();
    });

    await page.goto("/tax/payments");
    await expect(page.locator("td.animate-pulse").first()).toBeVisible();
    releaseFirstRequest();
    await expect(page.getByText("No payments to track")).toBeVisible();

    await page.route("**/tax/payments?*", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({
          title: "Server error",
          detail: "Unable to load payments",
          status: 500,
        }),
      });
    });
    await page.goto("/tax/payments");
    await expect(page.getByText("Unable to load payments")).toBeVisible();
    await expect(page.getByRole("button", { name: /Retry/i })).toBeVisible();
  });

  test("shows payment in /tax/payments after mark-paid flow in filing detail", async ({
    page,
    testData,
  }) => {
    await loginAsSeededUserUi(page, testData);
    const workspaceId = await resolveActiveWorkspaceId(page, testData.tenant.id);

    const seeded = await seedTaxScenario({
      tenantId: testData.tenant.id,
      workspaceId,
      actorUserId: testData.user.id,
      filingType: "VAT_PERIODIC",
      year: 2026,
      periodKey: "2026-Q1",
      withBlockers: false,
      includeSnapshots: true,
      invoiceCount: 3,
      expenseCount: 2,
      status: "SUBMITTED",
    });

    await page.goto(`/tax/filings/${seeded.filingId}`);
    await page.getByRole("button", { name: /^Mark as paid$/u }).click();

    const markPaidDialog = page.getByRole("dialog");
    await expect(markPaidDialog).toBeVisible();
    await markPaidDialog
      .locator('input:not([type="datetime-local"]):not([type="file"])')
      .first()
      .fill("900.00");
    await markPaidDialog.getByRole("button", { name: /^Mark paid$/u }).click();
    await expect(page.getByText(/^Paid$/u)).toBeVisible();

    await page.goto("/tax/payments");
    await expect(page.getByText(seeded.periodLabel)).toBeVisible();
    await expect(page.getByText(/^Paid$/u)).toBeVisible();
  });

  test("exports payments CSV and triggers a browser download", async ({ page, testData }) => {
    await loginAsSeededUserUi(page, testData);
    const workspaceId = await resolveActiveWorkspaceId(page, testData.tenant.id);

    await seedTaxScenario({
      tenantId: testData.tenant.id,
      workspaceId,
      actorUserId: testData.user.id,
      filingType: "VAT_ANNUAL",
      year: 2026,
      withBlockers: false,
      includeSnapshots: true,
      invoiceCount: 2,
      expenseCount: 2,
      status: "SUBMITTED",
    });

    await page.goto("/tax/payments");

    const [download] = await Promise.all([
      page.waitForEvent("download", { timeout: 10_000 }),
      page.getByRole("button", { name: /Export CSV/i }).click(),
    ]);

    expect(download.suggestedFilename()).toMatch(/tax-payments-/u);
  });
});
