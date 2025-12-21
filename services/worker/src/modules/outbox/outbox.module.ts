import { Module } from "@nestjs/common";
import { OutboxPollerService } from "./OutboxPollerService";
import { OutboxRepository } from "@kerniflow/data";
import { InvoiceEmailRequestedHandler } from "../invoices/invoice-email-requested.handler";

@Module({
  providers: [
    InvoiceEmailRequestedHandler,
    {
      provide: OutboxRepository,
      useValue: new OutboxRepository(),
    },
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
