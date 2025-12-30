import { Logger } from "@nestjs/common";
import type { EmailPort } from "@corely/core";

export class ConsoleEmailAdapter implements EmailPort {
  private readonly logger = new Logger(ConsoleEmailAdapter.name);

  async send(input: {
    to: string | string[];
    subject: string;
    html?: string;
    text?: string;
    from?: string;
    replyTo?: string;
  }): Promise<{ messageId?: string }> {
    this.logger.log(
      JSON.stringify({
        message: "workflow.email.send",
        to: input.to,
        subject: input.subject,
        from: input.from,
      })
    );

    return { messageId: `email-${Date.now()}` };
  }
}
