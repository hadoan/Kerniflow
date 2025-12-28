import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { selectors } from "../utils/selectors";

async function login(
  page: Page,
  creds: {
    email: string;
    password: string;
  }
) {
  await page.goto("/auth/login");
  await page.fill(selectors.auth.loginEmailInput, creds.email);
  await page.fill(selectors.auth.loginPasswordInput, creds.password);
  await page.click(selectors.auth.loginSubmitButton);
  await page.waitForURL("**/dashboard", { timeout: 10_000 });
}

test.describe("Customers", () => {
  test("displays customer list correctly", async ({ page, testData }) => {
    await login(page, { email: testData.user.email, password: testData.user.password });

    // Navigate to customers page
    await page.goto("/customers");
    await expect(page).toHaveURL(/\/customers$/);

    // Verify page title
    await expect(page.locator("h1")).toContainText(/customers/i);

    // Verify create button is visible
    await expect(page.locator(selectors.customers.createButton)).toBeVisible();
  });

  test("navigates to create customer page when clicking create button", async ({
    page,
    testData,
  }) => {
    await login(page, { email: testData.user.email, password: testData.user.password });

    await page.goto("/customers");
    await expect(page.locator(selectors.customers.createButton)).toBeVisible();

    await page.click(selectors.customers.createButton);

    // Verify navigation to create page
    await expect(page).toHaveURL(/\/customers\/new/);
    await expect(page.locator(selectors.customers.customerForm)).toBeVisible();
  });

  test("creates a new customer successfully", async ({ page, testData }) => {
    await login(page, { email: testData.user.email, password: testData.user.password });

    // Navigate to create customer page
    await page.goto("/customers/new");
    await expect(page.locator(selectors.customers.customerForm)).toBeVisible();

    // Fill in required customer information
    const customerData = {
      displayName: `Test Customer ${Date.now()}`,
      email: `test${Date.now()}@example.com`,
      phone: "+49 30 12345678",
      vatId: "DE123456789",
      addressLine1: "Teststraße 123",
      city: "Berlin",
      postalCode: "10115",
      country: "Germany",
      notes: "This is a test customer created by e2e tests",
    };

    await page.fill(selectors.customers.displayNameInput, customerData.displayName);
    await page.fill(selectors.customers.emailInput, customerData.email);
    await page.fill(selectors.customers.phoneInput, customerData.phone);
    await page.fill(selectors.customers.vatIdInput, customerData.vatId);
    await page.fill(selectors.customers.addressLine1Input, customerData.addressLine1);
    await page.fill(selectors.customers.addressCityInput, customerData.city);
    await page.fill(selectors.customers.addressPostalCodeInput, customerData.postalCode);
    await page.fill(selectors.customers.addressCountryInput, customerData.country);
    await page.fill(selectors.customers.notesInput, customerData.notes);

    // Submit the form
    await page.click(selectors.customers.submitButton);

    // Verify navigation back to customers list
    await expect(page).toHaveURL(/\/customers$/, { timeout: 10_000 });

    // Verify customer appears in list
    await expect(page.locator(`text=${customerData.displayName}`)).toBeVisible();
  });

  test("validates required fields when creating customer", async ({ page, testData }) => {
    await login(page, { email: testData.user.email, password: testData.user.password });

    // Navigate to create customer page
    await page.goto("/customers/new");
    await expect(page.locator(selectors.customers.customerForm)).toBeVisible();

    // Try to submit without filling required fields
    await page.click(selectors.customers.submitButton);

    // Should show validation error for display name
    await expect(page.locator("text=/Display name is required/i")).toBeVisible();
  });

  test("edits an existing customer successfully", async ({ page, testData }) => {
    await login(page, { email: testData.user.email, password: testData.user.password });

    // First, create a customer
    await page.goto("/customers/new");
    const originalName = `Edit Test Customer ${Date.now()}`;
    await page.fill(selectors.customers.displayNameInput, originalName);
    await page.fill(selectors.customers.emailInput, `edit${Date.now()}@example.com`);
    await page.click(selectors.customers.submitButton);

    // Wait for redirect to list
    await expect(page).toHaveURL(/\/customers$/, { timeout: 10_000 });

    // Click on the newly created customer to edit
    await page.click(`text=${originalName}`);

    // Verify we're on the edit page
    await expect(page).toHaveURL(/\/customers\/[a-zA-Z0-9-]+$/);
    await expect(page.locator(selectors.customers.customerForm)).toBeVisible();

    // Verify form is pre-filled with existing data
    await expect(page.locator(selectors.customers.displayNameInput)).toHaveValue(originalName);

    // Update the customer information
    const updatedName = `${originalName} - Updated`;
    const updatedPhone = "+49 40 87654321";

    await page.fill(selectors.customers.displayNameInput, updatedName);
    await page.fill(selectors.customers.phoneInput, updatedPhone);

    // Submit the form
    await page.click(selectors.customers.submitButton);

    // Verify navigation back to customers list
    await expect(page).toHaveURL(/\/customers$/, { timeout: 10_000 });

    // Verify updated customer appears in list
    await expect(page.locator(`text=${updatedName}`)).toBeVisible();
  });

  test("displays customer details correctly", async ({ page, testData }) => {
    await login(page, { email: testData.user.email, password: testData.user.password });

    // Create a customer with full details
    await page.goto("/customers/new");

    const customerData = {
      displayName: `Detail Test Customer ${Date.now()}`,
      email: `detail${Date.now()}@example.com`,
      phone: "+49 89 11223344",
      vatId: "DE987654321",
      addressLine1: "Leopoldstraße 55",
      addressLine2: "3. Stock",
      city: "Munich",
      postalCode: "80802",
      country: "Germany",
      notes: "Customer with complete information",
    };

    await page.fill(selectors.customers.displayNameInput, customerData.displayName);
    await page.fill(selectors.customers.emailInput, customerData.email);
    await page.fill(selectors.customers.phoneInput, customerData.phone);
    await page.fill(selectors.customers.vatIdInput, customerData.vatId);
    await page.fill(selectors.customers.addressLine1Input, customerData.addressLine1);
    await page.fill(selectors.customers.addressLine2Input, customerData.addressLine2);
    await page.fill(selectors.customers.addressCityInput, customerData.city);
    await page.fill(selectors.customers.addressPostalCodeInput, customerData.postalCode);
    await page.fill(selectors.customers.addressCountryInput, customerData.country);
    await page.fill(selectors.customers.notesInput, customerData.notes);

    await page.click(selectors.customers.submitButton);

    // Wait for redirect
    await expect(page).toHaveURL(/\/customers$/, { timeout: 10_000 });

    // Open the customer for editing to view details
    await page.click(`text=${customerData.displayName}`);

    // Verify all fields are correctly populated
    await expect(page.locator(selectors.customers.displayNameInput)).toHaveValue(
      customerData.displayName
    );
    await expect(page.locator(selectors.customers.emailInput)).toHaveValue(customerData.email);
    await expect(page.locator(selectors.customers.phoneInput)).toHaveValue(customerData.phone);
    await expect(page.locator(selectors.customers.vatIdInput)).toHaveValue(customerData.vatId);
    await expect(page.locator(selectors.customers.addressLine1Input)).toHaveValue(
      customerData.addressLine1
    );
    await expect(page.locator(selectors.customers.addressLine2Input)).toHaveValue(
      customerData.addressLine2
    );
    await expect(page.locator(selectors.customers.addressCityInput)).toHaveValue(customerData.city);
    await expect(page.locator(selectors.customers.addressPostalCodeInput)).toHaveValue(
      customerData.postalCode
    );
    await expect(page.locator(selectors.customers.addressCountryInput)).toHaveValue(
      customerData.country
    );
    await expect(page.locator(selectors.customers.notesInput)).toHaveValue(customerData.notes);
  });
});
