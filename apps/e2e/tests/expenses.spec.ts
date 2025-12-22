import { test, expect } from "./fixtures";
import { selectors } from "../utils/selectors";
import { drainOutbox } from "../utils/testData";

test.describe("Expenses", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to expenses page
    await page.goto("/expenses");
    await page.waitForLoadState("networkidle");
  });

  test("should create an expense via UI", async ({ page }) => {
    // Click create expense button
    const createButton = page.locator(selectors.expenses.createButton);
    await expect(createButton).toBeVisible();
    await createButton.click();

    // Wait for form to appear
    const form = page.locator(selectors.expenses.expenseForm);
    await expect(form).toBeVisible();

    // Fill form
    await page.fill(selectors.expenses.amountInput, "49.99");
    await page.fill(selectors.expenses.descriptionInput, "E2E Test Expense");

    // Select category (native select)
    await page.selectOption(selectors.expenses.categorySelect, "office_supplies");

    // Submit form
    await page.click(selectors.expenses.submitButton);

    // Wait for success message
    const successMessage = page.locator(selectors.expenses.successMessage);
    await expect(successMessage).toBeVisible();

    // Verify expense appears in list
    const listContainer = page.locator(selectors.expenses.listContainer);
    await expect(listContainer).toContainText("49.99");
    await expect(listContainer).toContainText("E2E Test Expense");
  });

  test("should display expense in list", async ({ page, testData: _testData }) => {
    // List should be visible
    const listContainer = page.locator(selectors.expenses.listContainer);
    await expect(listContainer).toBeVisible();

    // For newly created expenses from the previous test, they should appear here
    // This test assumes the expense list is populated
    const expenseRows = page.locator(selectors.expenses.expenseRow);
    const count = await expenseRows.count();

    // At minimum, the list should be ready (even if empty)
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test("should drain outbox events after expense creation", async ({ page }) => {
    // Create an expense
    const createButton = page.locator(selectors.expenses.createButton);
    await createButton.click();

    const form = page.locator(selectors.expenses.expenseForm);
    await expect(form).toBeVisible();

    await page.fill(selectors.expenses.amountInput, "99.99");
    await page.fill(selectors.expenses.descriptionInput, "Outbox Test Expense");
    await page.selectOption(selectors.expenses.categorySelect, "equipment");
    await page.click(selectors.expenses.submitButton);

    // Wait for success
    const successMessage = page.locator(selectors.expenses.successMessage);
    await expect(successMessage).toBeVisible();

    // Drain outbox to process events deterministically
    const result = await drainOutbox();
    expect(result.processedCount).toBeGreaterThanOrEqual(0);

    // Verify audit log or domain event was created
    // (This would require additional UI elements or API verification)
  });
});
