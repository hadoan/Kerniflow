import { Module } from "@nestjs/common";
import { InvoicesHttpController } from "./adapters/http/invoices.controller";
import { PrismaInvoiceRepoAdapter } from "./infrastructure/prisma/prisma-invoice-repo.adapter";
import { InvoicesApplication } from "./application/invoices.application";
import { NestLoggerAdapter } from "../../shared/adapters/logger/nest-logger.adapter";
import { SystemClock } from "../../shared/infrastructure/system-clock";
import { SystemIdGenerator } from "../../shared/infrastructure/system-id-generator";
import { CreateInvoiceUseCase } from "./application/use-cases/create-invoice/CreateInvoiceUseCase";
import { UpdateInvoiceUseCase } from "./application/use-cases/update-invoice/UpdateInvoiceUseCase";
import { FinalizeInvoiceUseCase } from "./application/use-cases/finalize-invoice/FinalizeInvoiceUseCase";
import { SendInvoiceUseCase } from "./application/use-cases/send-invoice/SendInvoiceUseCase";
import { RecordPaymentUseCase } from "./application/use-cases/record-payment/RecordPaymentUseCase";
import { CancelInvoiceUseCase } from "./application/use-cases/cancel-invoice/CancelInvoiceUseCase";
import { GetInvoiceByIdUseCase } from "./application/use-cases/get-invoice-by-id/GetInvoiceByIdUseCase";
import { ListInvoicesUseCase } from "./application/use-cases/list-invoices/ListInvoicesUseCase";
import {
  INVOICE_NUMBERING_PORT,
  InvoiceNumberingPort,
} from "./application/ports/invoice-numbering.port";
import { NOTIFICATION_PORT, NotificationPort } from "./application/ports/notification.port";
import { CLOCK_PORT_TOKEN } from "../../shared/ports/clock.port";
import { ID_GENERATOR_TOKEN } from "../../shared/ports/id-generator.port";
import { InvoiceNumberingAdapter } from "./infrastructure/prisma/prisma-numbering.adapter";
import { NoopNotificationAdapter } from "./infrastructure/prisma/noop-notification.adapter";
import { IdentityModule } from "../identity";

@Module({
  imports: [IdentityModule],
  controllers: [InvoicesHttpController],
  providers: [
    PrismaInvoiceRepoAdapter,
    SystemIdGenerator,
    SystemClock,
    { provide: ID_GENERATOR_TOKEN, useExisting: SystemIdGenerator },
    { provide: CLOCK_PORT_TOKEN, useExisting: SystemClock },
    { provide: INVOICE_NUMBERING_PORT, useClass: InvoiceNumberingAdapter },
    { provide: NOTIFICATION_PORT, useClass: NoopNotificationAdapter },
    {
      provide: CreateInvoiceUseCase,
      useFactory: (repo: PrismaInvoiceRepoAdapter, idGen: SystemIdGenerator) =>
        new CreateInvoiceUseCase({
          logger: new NestLoggerAdapter(),
          invoiceRepo: repo,
          idGenerator: idGen,
        }),
      inject: [PrismaInvoiceRepoAdapter, ID_GENERATOR_TOKEN],
    },
    {
      provide: UpdateInvoiceUseCase,
      useFactory: (repo: PrismaInvoiceRepoAdapter, idGen: SystemIdGenerator) =>
        new UpdateInvoiceUseCase({
          logger: new NestLoggerAdapter(),
          invoiceRepo: repo,
          idGenerator: idGen,
        }),
      inject: [PrismaInvoiceRepoAdapter, ID_GENERATOR_TOKEN],
    },
    {
      provide: FinalizeInvoiceUseCase,
      useFactory: (repo: PrismaInvoiceRepoAdapter, numbering: InvoiceNumberingPort) =>
        new FinalizeInvoiceUseCase({
          logger: new NestLoggerAdapter(),
          invoiceRepo: repo,
          numbering,
        }),
      inject: [PrismaInvoiceRepoAdapter, INVOICE_NUMBERING_PORT],
    },
    {
      provide: SendInvoiceUseCase,
      useFactory: (repo: PrismaInvoiceRepoAdapter, notification: NotificationPort) =>
        new SendInvoiceUseCase({
          logger: new NestLoggerAdapter(),
          invoiceRepo: repo,
          notification,
        }),
      inject: [PrismaInvoiceRepoAdapter, NOTIFICATION_PORT],
    },
    {
      provide: RecordPaymentUseCase,
      useFactory: (repo: PrismaInvoiceRepoAdapter, idGen: SystemIdGenerator) =>
        new RecordPaymentUseCase({
          logger: new NestLoggerAdapter(),
          invoiceRepo: repo,
          idGenerator: idGen,
        }),
      inject: [PrismaInvoiceRepoAdapter, ID_GENERATOR_TOKEN],
    },
    {
      provide: CancelInvoiceUseCase,
      useFactory: (repo: PrismaInvoiceRepoAdapter) =>
        new CancelInvoiceUseCase({
          logger: new NestLoggerAdapter(),
          invoiceRepo: repo,
        }),
      inject: [PrismaInvoiceRepoAdapter],
    },
    {
      provide: GetInvoiceByIdUseCase,
      useFactory: (repo: PrismaInvoiceRepoAdapter) =>
        new GetInvoiceByIdUseCase({ logger: new NestLoggerAdapter(), invoiceRepo: repo }),
      inject: [PrismaInvoiceRepoAdapter],
    },
    {
      provide: ListInvoicesUseCase,
      useFactory: (repo: PrismaInvoiceRepoAdapter) =>
        new ListInvoicesUseCase({ logger: new NestLoggerAdapter(), invoiceRepo: repo }),
      inject: [PrismaInvoiceRepoAdapter],
    },
    {
      provide: InvoicesApplication,
      useFactory: (
        createInvoice: CreateInvoiceUseCase,
        updateInvoice: UpdateInvoiceUseCase,
        finalizeInvoice: FinalizeInvoiceUseCase,
        sendInvoice: SendInvoiceUseCase,
        recordPayment: RecordPaymentUseCase,
        cancelInvoice: CancelInvoiceUseCase,
        getInvoice: GetInvoiceByIdUseCase,
        listInvoices: ListInvoicesUseCase
      ) =>
        new InvoicesApplication(
          createInvoice,
          updateInvoice,
          finalizeInvoice,
          sendInvoice,
          recordPayment,
          cancelInvoice,
          getInvoice,
          listInvoices
        ),
      inject: [
        CreateInvoiceUseCase,
        UpdateInvoiceUseCase,
        FinalizeInvoiceUseCase,
        SendInvoiceUseCase,
        RecordPaymentUseCase,
        CancelInvoiceUseCase,
        GetInvoiceByIdUseCase,
        ListInvoicesUseCase,
      ],
    },
  ],
  exports: [InvoicesApplication],
})
export class InvoicesModule {}
