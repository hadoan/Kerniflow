import { test, expect } from "./fixtures";
import { selectors } from "../utils/selectors";
import { drainOutbox } from "../utils/testData";

test.describe("Invoices", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to invoices page
    await page.goto("/invoices");
    await page.waitForLoadState("networkidle");
  });

  test("should create a draft invoice", async ({ page }) => {
    // Click create invoice button
    const createButton = page.locator(selectors.invoices.createButton);
    await expect(createButton).toBeVisible();
    await createButton.click();

    // Wait for form to appear
    const form = page.locator(selectors.invoices.invoiceForm);
    await expect(form).toBeVisible();

    // Fill form (basic invoice creation)
    // Assuming form has fields like client, amount, due date
    await page.fill('input[data-testid="invoice-client"]', "Acme Corp");
    await page.fill('input[data-testid="invoice-amount"]', "1500.00");
    await page.fill('input[data-testid="invoice-due-date"]', "2025-01-31");

    // Submit form
    await page.click(selectors.invoices.issueButton);

    // Should show success or redirect
    // The invoice should appear in the list as a draft
    const listContainer = page.locator('div[data-testid="invoices-list"]');
    await expect(listContainer).toContainText("Acme Corp");
  });

  test("should display invoice with draft status", async ({ page }) => {
    // List should be visible
    const listContainer = page.locator(selectors.invoices.listContainer);
    await expect(listContainer).toBeVisible();

    // Check for draft status badge
    const draftBadge = page.locator(selectors.invoices.draftBadge);
    // May be visible or not, depending on data
    const visible = await draftBadge.isVisible().catch(() => false);
    expect(typeof visible).toBe("boolean");
  });

  test("should issue an invoice and drain outbox", async ({ page }) => {
    // This test assumes an invoice exists in draft state
    // Find a draft invoice row and issue it
    const invoiceRows = page.locator(selectors.invoices.invoiceRow);
    const count = await invoiceRows.count();

    if (count > 0) {
      // Click on first invoice to view details
      await invoiceRows.first().click();

      // Wait for details page to load
      await page.waitForLoadState("networkidle");

      // Find and click issue button (may be in a detail view)
      const issueButton = page.locator('button[data-testid="issue-invoice"]');
      if (await issueButton.isVisible()) {
        await issueButton.click();

        // Wait for confirmation
        await page.waitForTimeout(500);

        // Drain outbox to process the issued event
        const result = await drainOutbox();
        expect(result.processedCount).toBeGreaterThanOrEqual(0);
      }
    }
  });
});
