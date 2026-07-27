import { expect, type Locator, type Page } from "@playwright/test";

export class MonthlyReportPreviewPage {
  readonly page: Page;
  readonly previewContainer: Locator;

  constructor(page: Page) {
    this.page = page;
    this.previewContainer = page.getByTestId("monthly-cash-report-preview");
  }

  async expectVisible() {
    await expect(this.previewContainer).toBeVisible();
  }

  async expectCoverageStatus(status: string) {
    await expect(this.previewContainer.locator(".coverage-status")).toContainText(status);
  }

  async expectMissingDayCount(count: number) {
    await expect(this.previewContainer.locator(".missing-days-count")).toContainText(
      count.toString()
    );
  }
}
