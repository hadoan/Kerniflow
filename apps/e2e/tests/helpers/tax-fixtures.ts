import { expect, type Locator, type Page } from "@playwright/test";
import type { TaxFilingType } from "@corely/contracts";
import { selectors } from "../../utils/selectors.ts";
import { apiClient } from "../../utils/api.ts";
import type { TestData } from "../../utils/testData.ts";

/**
 * Reused helpers/patterns for Tax E2E:
 * - Seeded tenant/user fixture from apps/e2e/tests/fixtures.ts
 * - Auth selectors from apps/e2e/utils/selectors.ts
 * - Test harness API client from apps/e2e/utils/api.ts
 */
export type TaxMatrixFilingType = "VAT_PERIODIC" | "VAT_ANNUAL";

export type TaxFilingMatrixCase = {
  filingType: TaxMatrixFilingType;
  taxApiType: Extract<TaxFilingType, "vat" | "vat-annual">;
  periodKey?: string;
  year: number;
  periodLabel: string;
  expectedTitleFormat: string;
  expectedTitle: string;
  expectPayStep: boolean;
};

export const TAX_FILING_MATRIX: TaxFilingMatrixCase[] = [
  {
    filingType: "VAT_PERIODIC",
    taxApiType: "vat",
    periodKey: "2026-Q1",
    year: 2026,
    periodLabel: "Q1 2026",
    expectedTitleFormat: "VAT Return — 2026 Q1",
    expectedTitle: "VAT Filing — Q1 2026",
    expectPayStep: true,
  },
  {
    filingType: "VAT_ANNUAL",
    taxApiType: "vat-annual",
    year: 2026,
    periodLabel: "2026",
    expectedTitleFormat: "Annual VAT Return — 2026",
    expectedTitle: "VAT Annual Filing — 2026",
    expectPayStep: true,
  },
];

export type SeedTaxScenarioRequest = {
  tenantId: string;
  workspaceId: string;
  actorUserId: string;
  filingType: TaxMatrixFilingType;
  year: number;
  periodKey?: string;
  withBlockers?: boolean;
  includeSnapshots?: boolean;
  invoiceCount?: number;
  expenseCount?: number;
  status?: "OPEN" | "SUBMITTED" | "PAID";
};

export type SeedTaxScenarioResponse = {
  filingId: string;
  filingType: TaxMatrixFilingType;
  filingApiType: "vat" | "vat-annual";
  periodLabel: string;
  periodKey?: string;
  year: number;
  invoiceIds: string[];
  expenseIds: string[];
  expectedTotals: {
    vatCollectedCents: number;
    vatPaidCents: number;
    netPayableCents: number;
    salesCount: number;
    purchaseCount: number;
    salesNetCents: number;
    purchaseNetCents: number;
  };
  blockerIssueCount: number;
};

export async function loginAsSeededUserUi(page: Page, testData: TestData): Promise<void> {
  await page.goto(`/auth/login?tenant=${encodeURIComponent(testData.tenant.id)}`);
  await page.fill(selectors.auth.loginEmailInput, testData.user.email);
  await page.fill(selectors.auth.loginPasswordInput, testData.user.password);
  await page.click(selectors.auth.loginSubmitButton);
  await page.waitForURL("**/dashboard", { timeout: 15_000 });
}

export async function resolveActiveWorkspaceId(page: Page, fallback: string): Promise<string> {
  const filingsRequestPromise = page
    .waitForRequest(
      (request) =>
        (request.resourceType() === "fetch" || request.resourceType() === "xhr") &&
        request.method() === "GET" &&
        request.url().includes("/tax/filings") &&
        !request.url().includes("/tax/filings/"),
      { timeout: 5_000 }
    )
    .catch(() => null);

  await page.goto("/tax/filings");
  const filingsRequest = await filingsRequestPromise;
  const workspaceFromHeader = filingsRequest?.headers()["x-workspace-id"];
  if (workspaceFromHeader) {
    return workspaceFromHeader;
  }

  const timeoutAt = Date.now() + 3_000;
  let activeWorkspaceId: string | null = null;

  while (!activeWorkspaceId && Date.now() < timeoutAt) {
    activeWorkspaceId = await page.evaluate(() => localStorage.getItem("corely-active-workspace"));
    if (activeWorkspaceId) {
      break;
    }
    await page.waitForTimeout(100);
  }

  return activeWorkspaceId || fallback;
}

export async function seedTaxScenario(
  request: SeedTaxScenarioRequest
): Promise<SeedTaxScenarioResponse> {
  return apiClient.post<SeedTaxScenarioResponse>("/test/tax/seed-filing-scenario", request);
}

export function euro(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

export function filingIdFromUrl(url: string): string {
  const match = url.match(/\/tax\/filings\/([^/?#]+)/u);
  if (!match) {
    throw new Error(`Could not parse filing id from URL: ${url}`);
  }
  return match[1];
}

export function filingStepper(page: Page): Locator {
  return page.getByTestId("tax-filing-stepper");
}

export function filingActivitySection(page: Page): Locator {
  return page
    .locator("div")
    .filter({ has: page.getByRole("heading", { name: /^Activity$/u }) })
    .first();
}

export async function openFilingOverflowMenu(page: Page): Promise<void> {
  const overflow = page.getByRole("button", { name: /More actions/i });
  await expect(overflow).toBeVisible();
  await overflow.click();
}

export async function goToFilingSubmitStep(page: Page): Promise<void> {
  const submitStepButton = filingStepper(page).getByRole("button", { name: /Submit$/u });
  await expect(submitStepButton).toBeVisible();
  await expect(submitStepButton).toBeEnabled();
  await submitStepButton.click();
  await expect(page.getByTestId("tax-filing-submit-step")).toBeVisible();
}

export async function openMarkPaidDialogFromFiling(page: Page): Promise<Locator | null> {
  const directMarkAsPaid = page.getByRole("button", { name: /^Mark as paid$/u });
  if ((await directMarkAsPaid.count()) > 0) {
    await directMarkAsPaid.first().click();
  } else {
    const headerMarkPaid = page.getByRole("button", { name: /^Mark paid$/u });
    if ((await headerMarkPaid.count()) === 0) {
      return null;
    }
    await headerMarkPaid.first().click();
    await expect(page.getByRole("heading", { level: 3, name: /^Pay$/u })).toBeVisible();
    await page
      .getByRole("button", { name: /^Mark as paid$/u })
      .first()
      .click();
  }

  const dialog = page.getByRole("dialog", { name: /Mark as paid/i });
  await expect(dialog).toBeVisible();
  return dialog;
}

export async function expectFilingScenarioHeader(
  page: Page,
  scenario: TaxFilingMatrixCase
): Promise<void> {
  const heading = page.getByRole("heading", { level: 1 });
  await expect(heading).toBeVisible();
  const headingText = ((await heading.textContent()) ?? "").trim();
  expect([scenario.expectedTitle, scenario.expectedTitleFormat]).toContain(headingText);
}
