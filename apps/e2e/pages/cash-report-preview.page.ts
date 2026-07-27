import { expect, type Locator, type Page } from "@playwright/test";

export class CashReportPreviewPage {
  readonly page: Page;
  readonly previewContainer: Locator;
  readonly statusBadge: Locator;
  readonly warningList: Locator;
  readonly printButton: Locator;
  readonly closeDayButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.previewContainer = page.getByTestId("cash-report-preview");
    this.statusBadge = page.getByTestId("cash-report-status");
    this.warningList = page.getByTestId("cash-report-warning");
    this.printButton = page.getByTestId("cash-report-print");
    this.closeDayButton = page.getByTestId("cash-report-close");
  }

  async expectVisible() {
    await expect(this.previewContainer).toBeVisible({ timeout: 15_000 });
  }

  async expectStatus(statusText: string) {
    await expect(this.statusBadge).toContainText(statusText, { timeout: 15_000 });
  }

  async expectAmount(label: string, amountStr: string) {
    // Looks for a row containing the label, then checks the amount
    await expect(this.previewContainer.locator("tr", { hasText: label })).toContainText(amountStr);
  }

  async closeDay() {
    await expect(this.closeDayButton).toBeEnabled();
    await this.closeDayButton.click();
  }
}
