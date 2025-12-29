import {
  type InvoiceEmailSenderPort,
  type SendInvoiceEmailRequest,
  type SendInvoiceEmailResponse,
} from "../../application/ports/invoice-email-sender.port";

export class FakeInvoiceEmailSender implements InvoiceEmailSenderPort {
  sentEmails: SendInvoiceEmailRequest[] = [];
  private shouldFail = false;
  private failureMessage = "Simulated email sending failure";

  async sendInvoiceEmail(req: SendInvoiceEmailRequest): Promise<SendInvoiceEmailResponse> {
    if (this.shouldFail) {
      throw new Error(this.failureMessage);
    }

    this.sentEmails.push({ ...req });

    return {
      provider: "resend",
      providerMessageId: `fake-msg-${Date.now()}`,
    };
  }

  // Test helpers
  getSentEmails(): SendInvoiceEmailRequest[] {
    return this.sentEmails;
  }

  getLastSentEmail(): SendInvoiceEmailRequest | undefined {
    return this.sentEmails[this.sentEmails.length - 1];
  }

  simulateFailure(message?: string): void {
    this.shouldFail = true;
    if (message) {
      this.failureMessage = message;
    }
  }

  simulateSuccess(): void {
    this.shouldFail = false;
  }

  clear(): void {
    this.sentEmails = [];
    this.shouldFail = false;
  }
}
