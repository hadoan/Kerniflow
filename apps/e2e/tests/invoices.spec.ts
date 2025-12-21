import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { selectors } from "../utils/selectors";

const API_URL = process.env.API_URL || "http://localhost:3000";

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

test.describe("Invoices", () => {
  test("creates a new invoice from the UI and persists it", async ({ page, testData }) => {
    await login(page, { email: testData.user.email, password: testData.user.password });

    await page.goto("/invoices");
    await expect(page.locator(selectors.invoices.createButton)).toBeVisible();
    await page.click(selectors.invoices.createButton);
    await expect(page).toHaveURL(/\/invoices\/new/);

    await page.waitForSelector(selectors.invoices.invoiceForm);

    const clientId = "client-1";
    let chosenClientId = clientId;
    await page.locator(selectors.invoices.customerSelect).click();
    const clientOption = page.locator(selectors.invoices.customerOption(clientId));
    if (await clientOption.count()) {
      await clientOption.click();
    } else {
      const firstOption = page.getByRole("option").first();
      const testId = await firstOption.getAttribute("data-testid");
      if (testId?.startsWith("invoice-customer-option-")) {
        chosenClientId = testId.replace("invoice-customer-option-", "");
      }
      await firstOption.click();
    }

    await page.locator(selectors.invoices.lineDescriptionInput()).fill("E2E Consulting Package");
    await page.locator(selectors.invoices.lineQtyInput()).fill("2");
    await page.locator(selectors.invoices.lineRateInput()).fill("150");

    const createResponsePromise = page.waitForResponse(
      (response) => response.url().includes("/invoices") && response.request().method() === "POST"
    );
    await page.click(selectors.invoices.submitButton);
    const createResponse = await createResponsePromise;

    expect(createResponse.ok()).toBeTruthy();

    const createdInvoice = await createResponse.json();
    expect(createdInvoice.customerId).toBe(chosenClientId);
    expect(createdInvoice.lineItems).toHaveLength(1);
    expect(createdInvoice.lineItems[0]).toMatchObject({
      description: "E2E Consulting Package",
      qty: 2,
      unitPriceCents: 15000,
    });
    expect(createdInvoice.totals.totalCents).toBe(30000);

    await expect(page).toHaveURL(/\/invoices$/);

    const accessToken = await page.evaluate(() => localStorage.getItem("accessToken"));
    const listResponse = await page.request.get(`${API_URL}/invoices`, {
      headers: { Authorization: `Bearer ${accessToken ?? ""}` },
    });
    expect(listResponse.ok()).toBeTruthy();
    const listBody: any = await listResponse.json();
    const invoiceIds: string[] = (listBody.items ?? []).map((inv: any) => inv.id);
    expect(invoiceIds).toContain(createdInvoice.id);
  });
});
