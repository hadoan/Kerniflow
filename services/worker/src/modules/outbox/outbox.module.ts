import { Module } from "@nestjs/common";
import { EnvService } from "@corely/config";
import { OutboxRepository } from "@corely/data";
import { InvoiceEmailRequestedHandler } from "../invoices/invoice-email-requested.handler";
import { PrismaInvoiceEmailRepository } from "../invoices/infrastructure/prisma-invoice-email-repository.adapter";
import { EMAIL_SENDER_PORT, EmailSenderPort } from "../notifications/ports/email-sender.port";
import { ResendEmailSenderAdapter } from "../notifications/infrastructure/resend/resend-email-sender.adapter";
import { OutboxPollerService } from "./outbox-poller.service";

@Module({
  providers: [
    {
      provide: EMAIL_SENDER_PORT,
      useFactory: (env: EnvService) => {
        const provider = env.EMAIL_PROVIDER;
        if (provider !== "resend") {
          throw new Error(`Unsupported email provider: ${provider}`);
        }
        return new ResendEmailSenderAdapter(
          env.RESEND_API_KEY,
          env.RESEND_FROM,
          env.RESEND_REPLY_TO
        );
      },
      inject: [EnvService],
    },
    {
      provide: InvoiceEmailRequestedHandler,
      useFactory: (sender: EmailSenderPort, repo: PrismaInvoiceEmailRepository) =>
        new InvoiceEmailRequestedHandler(sender, repo),
      inject: [EMAIL_SENDER_PORT, PrismaInvoiceEmailRepository],
    },
    PrismaInvoiceEmailRepository,
    {
      provide: OutboxPollerService,
      useFactory: (repo: OutboxRepository, invoiceHandler: InvoiceEmailRequestedHandler) => {
        return new OutboxPollerService(repo, [invoiceHandler]);
      },
      inject: [OutboxRepository, InvoiceEmailRequestedHandler],
    },
  ],
})
export class OutboxModule {}
