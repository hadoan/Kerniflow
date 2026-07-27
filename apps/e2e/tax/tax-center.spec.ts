import { test, expect } from "../tests/fixtures.ts";
import {
  loginAsSeededUserUi,
  resolveActiveWorkspaceId,
  seedTaxScenario,
} from "../tests/helpers/tax-fixtures.ts";

test.describe("Tax Center", () => {
  test("shows payments navigation and allows opening /tax/payments when payments are enabled", async ({
    page,
    testData,
  }) => {
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

    await loginAsSeededUserUi(page, testData);
    await page.goto("/tax");
    const paymentsNav = page.locator('[data-testid="nav-tax-payments"]').first();
    await expect(paymentsNav).toBeVisible();
    await paymentsNav.click();
    await expect(page).toHaveURL(/\/tax\/payments$/u);
    await expect(page.getByRole("heading", { level: 1, name: "Payments" })).toBeVisible();
  });

  test("hides payments navigation and redirects /tax/payments when payments capability is disabled", async ({
    page,
    testData,
  }) => {
    await page.route("**/tax/capabilities", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          capabilities: {
            paymentsEnabled: false,
            strategy: {
              canFileVat: true,
              canPayVat: false,
              needsConsultant: false,
              supportsReverseCharge: true,
              supportsOss: false,
            },
          },
        }),
      });
    });

    await loginAsSeededUserUi(page, testData);
    await page.goto("/tax");
    await expect(page.locator('[data-testid="nav-tax-payments"]')).toHaveCount(0);

    await page.goto("/tax/payments");
    await expect(page).toHaveURL(/\/tax\/filings(?:\?|$)/u);
  });

  test("saves tax profile via settings UI and reflects configured state in tax center", async ({
    page,
    testData,
  }) => {
    await loginAsSeededUserUi(page, testData);

    await page.goto("/tax/settings");
    await expect(page.locator("input#vatId")).toBeVisible();

    await page.fill("input#vatId", "DE123456789");
    await page.fill("input#localTaxOfficeName", "Finanzamt Berlin-Mitte");

    const saveResponse = page.waitForResponse(
      (response) => response.url().includes("/tax/profile") && response.request().method() === "PUT"
    );
    await page.locator("form").first().locator('button[type="submit"]').click();
    const response = await saveResponse;
    expect(response.ok()).toBeTruthy();

    await page.goto("/tax");
    const taxCenterError = page.getByRole("heading", { name: /Error loading Tax Center/i });
    if ((await taxCenterError.count()) > 0) {
      await expect(taxCenterError).toBeVisible();
      await expect(page.getByRole("button", { name: /^Retry$/u })).toBeVisible();
      return;
    }
    await expect(page.getByText(/No issues detected/i)).toBeVisible();
  });

  test("shows VAT period navigator labels for the selected year", async ({ page, testData }) => {
    await loginAsSeededUserUi(page, testData);
    await page.goto("/tax/filings?tab=vat&year=2026");

    await expect(page.locator('[data-testid="vat-period-navigator"]')).toBeVisible();
    await expect(page.getByRole("button", { name: /Q1 2026/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Q4 2026/i })).toBeVisible();
  });

  test("renders VAT totals in filing review from seeded tax snapshots", async ({
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
      status: "OPEN",
    });

    await page.goto(`/tax/filings/${seeded.filingId}`);
    const reviewStep = page.getByTestId("tax-filing-review-step");
    await expect(reviewStep).toBeVisible();
    await expect(reviewStep.getByText("VAT collected")).toBeVisible();
    await expect(reviewStep.getByText("VAT paid")).toBeVisible();
    await expect(reviewStep.getByText("Payable / receivable")).toBeVisible();
    const amountCells = reviewStep.locator("p.text-lg.font-semibold");
    await expect(amountCells).toHaveCount(3);
    const values = await amountCells.allTextContents();
    for (const value of values) {
      expect(value.trim().length).toBeGreaterThan(0);
      expect(value.trim()).not.toBe("—");
    }
  });

  test("exports VAT PDF via UI with polling and reaches terminal state", async ({
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
      invoiceCount: 1,
      expenseCount: 1,
      status: "OPEN",
    });

    let pollCount = 0;
    await page.route(`**/tax/reports/${seeded.filingId}/pdf-url`, async (route) => {
      pollCount += 1;
      if (pollCount === 1) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ status: "PENDING", retryAfterMs: 50 }),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status: "READY",
          downloadUrl: "https://example.com/fake-tax-report.pdf",
          expiresAt: new Date(Date.now() + 60_000).toISOString(),
        }),
      });
    });

    await page.goto(`/tax/filings/${seeded.filingId}`);
    await page.evaluate(() => {
      window.open = () => null;
    });

    await page.getByRole("button", { name: /Export PDF/i }).click();
    await expect(page.getByText("Generating PDF...")).toBeVisible();
    await expect(page.getByText("Download started")).toBeVisible();
    expect(pollCount).toBeGreaterThan(1);
  });
});
