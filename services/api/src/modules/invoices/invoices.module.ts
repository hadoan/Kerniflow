import { Module } from "@nestjs/common";
import { DataModule } from "@kerniflow/data";
import { OUTBOX_PORT } from "@kerniflow/kernel";
import type { OutboxPort } from "@kerniflow/kernel";
import { chromium } from "playwright";
import { KernelModule } from "../../shared/kernel/kernel.module";
import { InvoicesHttpController } from "./adapters/http/invoices.controller";
import { ResendWebhookController } from "./adapters/webhooks/resend-webhook.controller";
import { PrismaInvoiceEmailDeliveryRepoAdapter } from "./infrastructure/prisma/prisma-invoice-email-delivery-repo.adapter";
import { InvoicesApplication } from "./application/invoices.application";
import { NestLoggerAdapter } from "../../shared/adapters/logger/nest-logger.adapter";
import {
  INVOICE_NUMBERING_PORT,
  InvoiceNumberingPort,
} from "./application/ports/invoice-numbering.port";
import { CUSTOMER_QUERY_PORT, CustomerQueryPort } from "./application/ports/customer-query.port";
import { INVOICE_PDF_MODEL_PORT } from "./application/ports/invoice-pdf-model.port";
import { INVOICE_PDF_RENDERER_PORT } from "./application/ports/invoice-pdf-renderer.port";
import { CLOCK_PORT_TOKEN } from "../../shared/ports/clock.port";
import { ID_GENERATOR_TOKEN } from "../../shared/ports/id-generator.port";
import { InvoiceNumberingAdapter } from "./infrastructure/prisma/prisma-numbering.adapter";
import { IdentityModule } from "../identity";
import { TimeService } from "@kerniflow/kernel";
import { PrismaTenantTimeZoneAdapter } from "../../shared/infrastructure/time/prisma-tenant-timezone.adapter";
import { TENANT_TIMEZONE_PORT } from "../../shared/time/tenant-timezone.token";
import { PartyModule } from "../party";
import { DocumentsModule } from "../documents";
import { CancelInvoiceUseCase } from "./application/use-cases/cancel-invoice/cancel-invoice.usecase";
import { CreateInvoiceUseCase } from "./application/use-cases/create-invoice/create-invoice.usecase";
import { FinalizeInvoiceUseCase } from "./application/use-cases/finalize-invoice/finalize-invoice.usecase";
import { GetInvoiceByIdUseCase } from "./application/use-cases/get-invoice-by-id/get-invoice-by-id.usecase";
import { ListInvoicesUseCase } from "./application/use-cases/list-invoices/list-invoices.usecase";
import { RecordPaymentUseCase } from "./application/use-cases/record-payment/record-payment.usecase";
import { SendInvoiceUseCase } from "./application/use-cases/send-invoice/send-invoice.usecase";
import { UpdateInvoiceUseCase } from "./application/use-cases/update-invoice/update-invoice.usecase";
import { DownloadInvoicePdfUseCase } from "./application/use-cases/download-invoice-pdf/download-invoice-pdf.usecase";
import { PrismaInvoiceRepoAdapter } from "./infrastructure/adapters/prisma-invoice-repository.adapter";
import { PrismaInvoicePdfModelAdapter } from "./infrastructure/pdf/prisma-invoice-pdf-model.adapter";
import { PlaywrightInvoicePdfRendererAdapter } from "./infrastructure/pdf/playwright-invoice-pdf-renderer.adapter";
import { GcsObjectStorageAdapter } from "../documents/infrastructure/storage/gcs/gcs-object-storage.adapter";

@Module({
  imports: [DataModule, KernelModule, IdentityModule, PartyModule, DocumentsModule],
  controllers: [InvoicesHttpController, ResendWebhookController],
  providers: [
    PrismaInvoiceRepoAdapter,
    PrismaTenantTimeZoneAdapter,
    { provide: TENANT_TIMEZONE_PORT, useExisting: PrismaTenantTimeZoneAdapter },
    {
      provide: TimeService,
      useFactory: (clock: any, tenantTz: PrismaTenantTimeZoneAdapter) =>
        new TimeService(clock, tenantTz),
      inject: [CLOCK_PORT_TOKEN, TENANT_TIMEZONE_PORT],
    },
    { provide: INVOICE_NUMBERING_PORT, useClass: InvoiceNumberingAdapter },
    { provide: INVOICE_PDF_MODEL_PORT, useClass: PrismaInvoicePdfModelAdapter },
    {
      provide: "PLAYWRIGHT_BROWSER",
      useFactory: async () => {
        return await chromium.launch({ headless: true });
      },
    },
    {
      provide: INVOICE_PDF_RENDERER_PORT,
      useFactory: (browser: any) => new PlaywrightInvoicePdfRendererAdapter(browser),
      inject: ["PLAYWRIGHT_BROWSER"],
    },
    PrismaInvoiceEmailDeliveryRepoAdapter,
    {
      provide: CreateInvoiceUseCase,
      useFactory: (
        repo: PrismaInvoiceRepoAdapter,
        idGen: any,
        clock: any,
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
        idGen: any,
        clock: any,
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
        clock: any,
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
        outbox: OutboxPort,
        idGen: any
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
        OUTBOX_PORT,
        ID_GENERATOR_TOKEN,
      ],
    },
    {
      provide: RecordPaymentUseCase,
      useFactory: (repo: PrismaInvoiceRepoAdapter, idGen: any, clock: any) =>
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
      useFactory: (repo: PrismaInvoiceRepoAdapter, clock: any) =>
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
      provide: DownloadInvoicePdfUseCase,
      useFactory: (
        repo: PrismaInvoiceRepoAdapter,
        pdfModel: any,
        renderer: any,
        storage: GcsObjectStorageAdapter
      ) => new DownloadInvoicePdfUseCase(repo, pdfModel, renderer, storage),
      inject: [
        PrismaInvoiceRepoAdapter,
        INVOICE_PDF_MODEL_PORT,
        INVOICE_PDF_RENDERER_PORT,
        GcsObjectStorageAdapter,
      ],
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
        listInvoices: ListInvoicesUseCase,
        downloadPdf: DownloadInvoicePdfUseCase
      ) =>
        new InvoicesApplication(
          createInvoice,
          updateInvoice,
          finalizeInvoice,
          sendInvoice,
          recordPayment,
          cancelInvoice,
          getInvoice,
          listInvoices,
          downloadPdf
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
        DownloadInvoicePdfUseCase,
      ],
    },
  ],
  exports: [InvoicesApplication],
})
export class InvoicesModule {}
