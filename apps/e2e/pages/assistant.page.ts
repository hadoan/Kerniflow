import { expect, type Locator, type Page } from "@playwright/test";

export class CashAssistantPage {
  readonly page: Page;
  readonly chatInput: Locator;
  readonly chatSubmitButton: Locator;
  readonly confirmationCard: Locator;
  readonly confirmSaveButton: Locator;
  readonly confirmCloseButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.chatInput = page.getByTestId("cash-assistant-message-input");
    this.chatSubmitButton = page.locator('button[type="submit"]', { hasText: /send|submit/i });
    this.confirmationCard = page.getByTestId("cash-confirmation-card");
    this.confirmSaveButton = page.getByTestId("cash-confirmation-submit");
    this.confirmCloseButton = page.getByTestId("cash-report-close");
  }

  async goto(registerId: string, day?: string) {
    let url = `/assistant?registerId=${encodeURIComponent(registerId)}`;
    if (day) url += `&day=${day}`;
    await this.page.goto(url);
    await expect(this.chatInput).toBeVisible();
  }

  /**
   * Wait for the streaming response to finish.
   * The chat input is disabled while streaming/submitted; it re-enables when done.
   */
  async waitForResponse(timeout = 60_000) {
    // First wait for the input to become disabled (streaming started)
    await expect(this.chatInput).toBeDisabled({ timeout: 10_000 }).catch(() => {
      // May already be done if response was very fast
    });
    // Then wait for it to become enabled again (streaming finished)
    await expect(this.chatInput).toBeEnabled({ timeout });
  }

  async sendMessage(message: string, waitForDone = true) {
    await this.chatInput.fill(message);
    await this.chatSubmitButton.click();
    if (waitForDone) {
      await this.waitForResponse();
    }
  }

  async confirmSummary() {
    await expect(this.confirmationCard).toBeVisible();
    await this.confirmSaveButton.click();
  }
}

