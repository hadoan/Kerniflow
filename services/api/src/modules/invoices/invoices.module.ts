import { Module } from "@nestjs/common";
import { InvoicesHttpController } from "./adapters/http/invoices.controller";
import { ResendWebhookController } from "./adapters/webhooks/resend-webhook.controller";
import { PrismaInvoiceEmailDeliveryRepoAdapter } from "./infrastructure/prisma/prisma-invoice-email-delivery-repo.adapter";
import { PrismaOutboxAdapter } from "./infrastructure/outbox/prisma-outbox.adapter";
import { InvoicesApplication } from "./application/invoices.application";
import { NestLoggerAdapter } from "../../shared/adapters/logger/nest-logger.adapter";
import { SystemClock } from "../../shared/infrastructure/system-clock";
import { SystemIdGenerator } from "../../shared/infrastructure/system-id-generator";
import {
  INVOICE_NUMBERING_PORT,
  InvoiceNumberingPort,
} from "./application/ports/invoice-numbering.port";
import { CUSTOMER_QUERY_PORT, CustomerQueryPort } from "./application/ports/customer-query.port";
import { CLOCK_PORT_TOKEN } from "../../shared/ports/clock.port";
import { ID_GENERATOR_TOKEN } from "../../shared/ports/id-generator.port";
import { InvoiceNumberingAdapter } from "./infrastructure/prisma/prisma-numbering.adapter";
import { IdentityModule } from "../identity";
import { TimeService } from "@kerniflow/kernel";
import { PrismaTenantTimeZoneAdapter } from "../../shared/time/prisma-tenant-timezone.adapter";
import { TENANT_TIMEZONE_PORT } from "../../shared/time/tenant-timezone.token";
import { PartyCrmModule } from "../party-crm";
import { CancelInvoiceUseCase } from "./application/use-cases/cancel-invoice/cancel-invoice.usecase";
import { CreateInvoiceUseCase } from "./application/use-cases/create-invoice/create-invoice.usecase";
import { FinalizeInvoiceUseCase } from "./application/use-cases/finalize-invoice/finalize-invoice.usecase";
import { GetInvoiceByIdUseCase } from "./application/use-cases/get-invoice-by-id/get-invoice-by-id.usecase";
import { ListInvoicesUseCase } from "./application/use-cases/list-invoices/list-invoices.usecase";
import { RecordPaymentUseCase } from "./application/use-cases/record-payment/record-payment.usecase";
import { SendInvoiceUseCase } from "./application/use-cases/send-invoice/send-invoice.usecase";
import { UpdateInvoiceUseCase } from "./application/use-cases/update-invoice/update-invoice.usecase";
import { PrismaInvoiceRepoAdapter } from "./infrastructure/adapters/prisma-invoice-repository.adapter";

@Module({
  imports: [IdentityModule, PartyCrmModule],
  controllers: [InvoicesHttpController, ResendWebhookController],
  providers: [
    PrismaInvoiceRepoAdapter,
    SystemIdGenerator,
    SystemClock,
    PrismaTenantTimeZoneAdapter,
    { provide: ID_GENERATOR_TOKEN, useExisting: SystemIdGenerator },
    { provide: CLOCK_PORT_TOKEN, useExisting: SystemClock },
    { provide: TENANT_TIMEZONE_PORT, useExisting: PrismaTenantTimeZoneAdapter },
    {
      provide: TimeService,
      useFactory: (clock: SystemClock, tenantTz: PrismaTenantTimeZoneAdapter) =>
        new TimeService(clock, tenantTz),
      inject: [CLOCK_PORT_TOKEN, TENANT_TIMEZONE_PORT],
    },
    { provide: INVOICE_NUMBERING_PORT, useClass: InvoiceNumberingAdapter },
    PrismaInvoiceEmailDeliveryRepoAdapter,
    PrismaOutboxAdapter,
    {
      provide: CreateInvoiceUseCase,
      useFactory: (
        repo: PrismaInvoiceRepoAdapter,
        idGen: SystemIdGenerator,
        clock: SystemClock,
        timeService: TimeService,
        customerQuery: CustomerQueryPort
      ) =>
        new CreateInvoiceUseCase({
          logger: new NestLoggerAdapter(),
          invoiceRepo: repo,
          idGenerator: idGen,
          clock,
          timeService,
          customerQuery,
        }),
      inject: [
        PrismaInvoiceRepoAdapter,
        ID_GENERATOR_TOKEN,
        CLOCK_PORT_TOKEN,
        TimeService,
        CUSTOMER_QUERY_PORT,
      ],
    },
    {
      provide: UpdateInvoiceUseCase,
      useFactory: (
        repo: PrismaInvoiceRepoAdapter,
        idGen: SystemIdGenerator,
        clock: SystemClock,
        customerQuery: CustomerQueryPort
      ) =>
        new UpdateInvoiceUseCase({
          logger: new NestLoggerAdapter(),
          invoiceRepo: repo,
          idGenerator: idGen,
          clock,
          customerQuery,
        }),
      inject: [PrismaInvoiceRepoAdapter, ID_GENERATOR_TOKEN, CLOCK_PORT_TOKEN, CUSTOMER_QUERY_PORT],
    },
    {
      provide: FinalizeInvoiceUseCase,
      useFactory: (
        repo: PrismaInvoiceRepoAdapter,
        numbering: InvoiceNumberingPort,
        clock: SystemClock,
        customerQuery: CustomerQueryPort
      ) =>
        new FinalizeInvoiceUseCase({
          logger: new NestLoggerAdapter(),
          invoiceRepo: repo,
          numbering,
          clock,
          customerQuery,
        }),
      inject: [
        PrismaInvoiceRepoAdapter,
        INVOICE_NUMBERING_PORT,
        CLOCK_PORT_TOKEN,
        CUSTOMER_QUERY_PORT,
      ],
    },
    {
      provide: SendInvoiceUseCase,
      useFactory: (
        repo: PrismaInvoiceRepoAdapter,
        deliveryRepo: PrismaInvoiceEmailDeliveryRepoAdapter,
        outbox: PrismaOutboxAdapter,
        idGen: SystemIdGenerator
      ) =>
        new SendInvoiceUseCase({
          logger: new NestLoggerAdapter(),
          invoiceRepo: repo,
          deliveryRepo,
          outbox,
          idGenerator: idGen,
        }),
      inject: [
        PrismaInvoiceRepoAdapter,
        PrismaInvoiceEmailDeliveryRepoAdapter,
        PrismaOutboxAdapter,
        ID_GENERATOR_TOKEN,
      ],
    },
    {
      provide: RecordPaymentUseCase,
      useFactory: (repo: PrismaInvoiceRepoAdapter, idGen: SystemIdGenerator, clock: SystemClock) =>
        new RecordPaymentUseCase({
          logger: new NestLoggerAdapter(),
          invoiceRepo: repo,
          idGenerator: idGen,
          clock,
        }),
      inject: [PrismaInvoiceRepoAdapter, ID_GENERATOR_TOKEN, CLOCK_PORT_TOKEN],
    },
    {
      provide: CancelInvoiceUseCase,
      useFactory: (repo: PrismaInvoiceRepoAdapter, clock: SystemClock) =>
        new CancelInvoiceUseCase({
          logger: new NestLoggerAdapter(),
          invoiceRepo: repo,
          clock,
        }),
      inject: [PrismaInvoiceRepoAdapter, CLOCK_PORT_TOKEN],
    },
    {
      provide: GetInvoiceByIdUseCase,
      useFactory: (repo: PrismaInvoiceRepoAdapter) =>
        new GetInvoiceByIdUseCase({ logger: new NestLoggerAdapter(), invoiceRepo: repo }),
      inject: [PrismaInvoiceRepoAdapter],
    },
    {
      provide: ListInvoicesUseCase,
      useFactory: (repo: PrismaInvoiceRepoAdapter, timeService: TimeService) =>
        new ListInvoicesUseCase({
          logger: new NestLoggerAdapter(),
          invoiceRepo: repo,
          timeService,
        }),
      inject: [PrismaInvoiceRepoAdapter, TimeService],
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
