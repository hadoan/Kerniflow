import type { Locator, Page } from "@playwright/test";
import { test, expect } from "../tests/fixtures.ts";
import { loginAsSeededUserUi } from "../tests/helpers/tax-fixtures.ts";
import { selectors } from "../utils/selectors.ts";

type CreateExpenseResponse = {
  id: string;
};

type VatPeriod = {
  year: number;
  quarter: number;
  periodKey: string;
  periodLabel: string;
};

type ExpectedVatTotals = {
  vatCollectedCents: number;
  vatPaidCents: number;
  netPayableCents: number;
  salesCount: number;
  salesNetCents: number;
  purchaseCount: number;
  purchaseNetCents: number;
};

const INVOICE_QTY = 2;
const INVOICE_RATE_EUR = 150;
const EXPENSE_TOTAL_EUR = 119;
const EXPENSE_VAT_RATE_PERCENT = 19;

function getCurrentVatQuarter(): VatPeriod {
  const now = new Date();
  const year = now.getUTCFullYear();
  const quarter = Math.floor(now.getUTCMonth() / 3) + 1;
  return {
    year,
    quarter,
    periodKey: `${year}-Q${quarter}`,
    periodLabel: `Q${quarter} ${year}`,
  };
}

function euro(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function expectedVatTotals(): ExpectedVatTotals {
  const invoiceLineTotalCents = Math.round(INVOICE_QTY * INVOICE_RATE_EUR * 100);
  const vatCollectedCents = Math.round((invoiceLineTotalCents * EXPENSE_VAT_RATE_PERCENT) / 100);
  const salesNetCents = invoiceLineTotalCents;
  const expenseTotalCents = Math.round(EXPENSE_TOTAL_EUR * 100);
  const vatPaidCents = Math.round((expenseTotalCents * EXPENSE_VAT_RATE_PERCENT) / 100);
  const purchaseNetCents = expenseTotalCents - vatPaidCents;

  return {
    vatCollectedCents,
    vatPaidCents,
    netPayableCents: vatCollectedCents - vatPaidCents,
    salesCount: 1,
    salesNetCents,
    purchaseCount: 1,
    purchaseNetCents,
  };
}

function summaryAmount(reviewStep: Locator, label: string): Locator {
  return reviewStep.getByText(label, { exact: true }).locator("xpath=following-sibling::p[1]");
}

async function configureTaxProfileViaUi(page: Page): Promise<void> {
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
}

async function selectAnyCustomer(page: Page): Promise<void> {
  await page.locator(selectors.invoices.customerSelect).click();
  const firstOption = page.locator('[data-testid^="invoice-customer-option-"]').first();
  await expect(firstOption).toBeVisible();
  await firstOption.click();
}

async function createCustomerViaUi(page: Page): Promise<void> {
  const timestamp = Date.now();
  await page.goto("/customers/new");
  await expect(page.locator(selectors.customers.customerForm)).toBeVisible();
  await page.fill(selectors.customers.displayNameInput, `VAT E2E Customer ${timestamp}`);
  await page.fill(selectors.customers.emailInput, `vat-e2e-${timestamp}@example.com`);
  await page.click(selectors.customers.submitButton);
  await expect(page).toHaveURL(/\/customers$/u);
}

async function createIssuedInvoice(page: Page): Promise<string> {
  await page.goto("/invoices/new");
  await expect(page.locator(selectors.invoices.invoiceForm)).toBeVisible();

  await selectAnyCustomer(page);

  await page.locator(selectors.invoices.lineDescriptionInput()).fill("VAT E2E Service");
  await page.locator(selectors.invoices.lineQtyInput()).fill(String(INVOICE_QTY));
  await page.locator(selectors.invoices.lineRateInput()).fill(String(INVOICE_RATE_EUR));

  const createInvoiceResponsePromise = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      new URL(response.url()).pathname.endsWith("/invoices")
  );
  await page.click(selectors.invoices.submitButton);

  const createInvoiceResponse = await createInvoiceResponsePromise;
  expect(createInvoiceResponse.ok()).toBeTruthy();

  // New Invoice page triggers an additional status flow (issue/finalize) before redirecting.
  await expect(page).toHaveURL(/\/invoices$/u, { timeout: 15_000 });

  const firstRow = page.locator(selectors.invoices.invoiceRow).first();
  await expect(firstRow).toBeVisible();
  const rowTestId = await firstRow.getAttribute("data-testid");
  expect(rowTestId).toBeTruthy();
  const match = rowTestId?.match(/^invoice-row-(.+)$/u);
  if (!match) {
    throw new Error(`Could not parse invoice id from row test id: ${rowTestId}`);
  }
  const invoiceId = match[1];

  await page.goto(`/invoices/${invoiceId}`);

  const draftStatusButton = page.getByRole("button", { name: /^Draft$/i }).first();
  if ((await draftStatusButton.count()) > 0) {
    await draftStatusButton.click();
    const issueInvoiceAction = page
      .getByRole("button", { name: /Issue invoice|Issue Invoice/i })
      .first();
    if ((await issueInvoiceAction.count()) > 0) {
      const finalizeResponsePromise = page.waitForResponse(
        (response) =>
          response.url().includes(`/invoices/${invoiceId}/finalize`) &&
          response.request().method() === "POST"
      );
      await issueInvoiceAction.click();
      const finalizeResponse = await finalizeResponsePromise;
      expect(finalizeResponse.ok()).toBeTruthy();
    }
  }

  const issuedOrPaidStatus = page.getByRole("button", { name: /Issued|Paid/i }).first();
  await expect(issuedOrPaidStatus).toBeVisible();

  return invoiceId;
}

async function recordInvoicePayment(page: Page, invoiceId: string): Promise<void> {
  await page.goto(`/invoices/${invoiceId}`);
  const recordPaymentButton = page.getByRole("button", { name: /^Record Payment$/i }).first();
  await expect(recordPaymentButton).toBeVisible();
  await recordPaymentButton.click();

  const dialog = page.getByRole("dialog", { name: /Record Payment/i });
  await expect(dialog).toBeVisible();

  const amountInput = dialog.locator("#payment-amount");
  const currentValue = await amountInput.inputValue();
  const valueToSubmit = !currentValue || Number(currentValue) <= 0 ? "357.00" : currentValue;
  await amountInput.fill(valueToSubmit);
  await dialog.locator("#payment-note").fill("VAT E2E payment");

  const recordPaymentResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes(`/invoices/${invoiceId}/payments`) &&
      response.request().method() === "POST"
  );
  await dialog.getByRole("button", { name: /^Record Payment$/i }).click();

  const recordPaymentResponse = await recordPaymentResponsePromise;
  expect(recordPaymentResponse.ok()).toBeTruthy();
  await expect(page.getByRole("button", { name: /Paid/i }).first()).toBeVisible();
}

async function createExpense(page: Page): Promise<string> {
  await page.goto("/expenses/new");
  await expect(page.locator(selectors.expenses.expenseForm)).toBeVisible();

  await page.selectOption(selectors.expenses.categorySelect, "office_supplies");
  await page.fill(selectors.expenses.descriptionInput, "VAT E2E Expense");
  await page.fill(selectors.expenses.amountInput, `${EXPENSE_TOTAL_EUR.toFixed(2)}`);

  const createExpenseResponsePromise = page.waitForResponse(
    (response) => response.url().includes("/expenses") && response.request().method() === "POST"
  );
  await page.click(selectors.expenses.submitButton);

  const createExpenseResponse = await createExpenseResponsePromise;
  expect(createExpenseResponse.ok()).toBeTruthy();
  const expense = (await createExpenseResponse.json()) as CreateExpenseResponse;
  expect(expense.id).toBeTruthy();

  return expense.id;
}

async function transitionExpenseIfPossible(page: Page, expenseId: string, label: RegExp) {
  const statusChip = page.getByRole("button", {
    name: /Draft|Submitted|Approved|Paid|Rejected/i,
  });
  await expect(statusChip.first()).toBeVisible();

  await statusChip.first().click();
  const transitionButton = page.getByRole("button", { name: label });
  if ((await transitionButton.count()) === 0) {
    await page.keyboard.press("Escape");
    return;
  }

  const transitionResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes(`/expenses/${expenseId}/transition`) &&
      response.request().method() === "POST"
  );

  await transitionButton.first().click();
  const transitionResponse = await transitionResponsePromise;
  expect(transitionResponse.ok()).toBeTruthy();
}

async function ensureExpenseIsValid(page: Page, expenseId: string): Promise<void> {
  await page.goto(`/expenses/${expenseId}`);

  const statusChip = page.getByRole("button", {
    name: /Draft|Submitted|Approved|Paid|Rejected/i,
  });
  await expect(statusChip.first()).toBeVisible();

  const initialStatus = (await statusChip.first().textContent()) ?? "";
  if (/Approved|Paid/i.test(initialStatus)) {
    return;
  }

  if (/Draft/i.test(initialStatus)) {
    await transitionExpenseIfPossible(page, expenseId, /^Submit$/i);
  }

  const afterSubmitStatus = (await statusChip.first().textContent()) ?? "";
  if (/Submitted/i.test(afterSubmitStatus)) {
    await transitionExpenseIfPossible(page, expenseId, /^Approve$/i);
  }

  await expect(statusChip.first()).toContainText(/Approved|Paid/i);
}

async function createVatFiling(page: Page, period: VatPeriod): Promise<void> {
  await page.goto("/tax/filings/new");

  await page.getByRole("combobox").first().click();
  await page.getByRole("option", { name: /Annual VAT/i }).click();

  const yearInput = page.locator('input[type="number"]').first();
  await yearInput.fill(String(period.year));

  const createFilingResponsePromise = page.waitForResponse(
    (response) => response.url().includes("/tax/filings") && response.request().method() === "POST"
  );

  await page.getByRole("button", { name: /Create Filing/i }).click();

  const createFilingResponse = await createFilingResponsePromise;
  expect(createFilingResponse.ok()).toBeTruthy();
  await expect(page).toHaveURL(/\/tax\/filings\/[^/]+$/u);
}

async function recalculateFiling(page: Page): Promise<void> {
  const recalcButton = page
    .getByTestId("tax-filing-review-step")
    .getByRole("button", { name: /^Recalculate$/u });
  await expect(recalcButton).toBeVisible();
  const recalcResponsePromise = page.waitForResponse(
    (response) => response.url().includes("/recalculate") && response.request().method() === "POST"
  );
  await recalcButton.click();
  const recalcResponse = await recalcResponsePromise;
  expect(recalcResponse.ok()).toBeTruthy();
}

test.describe("Tax VAT Filing - UI Seeded Data", () => {
  test("creates invoice+payment and expense via UI, then validates VAT totals on filing", async ({
    page,
    testData,
  }) => {
    await loginAsSeededUserUi(page, testData);
    await configureTaxProfileViaUi(page);
    await createCustomerViaUi(page);

    const invoiceId = await createIssuedInvoice(page);

    const expenseId = await createExpense(page);
    await ensureExpenseIsValid(page, expenseId);

    const vatPeriod = getCurrentVatQuarter();
    await createVatFiling(page, vatPeriod);
    await recalculateFiling(page);

    const reviewStep = page.getByTestId("tax-filing-review-step");
    await expect(reviewStep).toBeVisible();
    const expected = expectedVatTotals();

    await expect(summaryAmount(reviewStep, "VAT collected")).toHaveText(
      euro(expected.vatCollectedCents)
    );
    await expect(summaryAmount(reviewStep, "VAT paid")).toHaveText(euro(expected.vatPaidCents));
    await expect(summaryAmount(reviewStep, "Payable / receivable")).toHaveText(
      euro(expected.netPayableCents)
    );

    await reviewStep.getByRole("button", { name: "Sales / invoices included" }).click();
    await expect(
      reviewStep.getByText(
        new RegExp(
          `${expected.salesCount} invoice item\\(s\\)\\s*•\\s*Net\\s*${escapeRegExp(euro(expected.salesNetCents))}`,
          "u"
        )
      )
    ).toBeVisible();

    await reviewStep.getByRole("button", { name: "Purchases / expenses included" }).click();
    await expect(
      reviewStep.getByText(
        new RegExp(
          `${expected.purchaseCount} expense item\\(s\\)\\s*•\\s*Net\\s*${escapeRegExp(euro(expected.purchaseNetCents))}`,
          "u"
        )
      )
    ).toBeVisible();

    await recordInvoicePayment(page, invoiceId);

    if (process.env.PW_HOLD_LAST_STEP === "1") {
      await page.pause();
    }
  });
});
