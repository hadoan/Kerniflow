import { Module } from "@nestjs/common";
import { EnvService } from "@corely/config";
import { DocumentsController } from "./adapters/http/documents.controller";
import { InvoicePdfController } from "./adapters/http/invoice-pdf.controller";
import { DocumentsApplication } from "./application/documents.application";
import { PrismaDocumentRepoAdapter } from "./infrastructure/prisma/prisma-document-repo.adapter";
import { PrismaFileRepoAdapter } from "./infrastructure/prisma/prisma-file-repo.adapter";
import { PrismaDocumentLinkAdapter } from "./infrastructure/prisma/prisma-document-link.adapter";
import { GcsObjectStorageAdapter } from "./infrastructure/storage/gcs/gcs-object-storage.adapter";
import { createGcsClient } from "./infrastructure/storage/gcs/gcs.client";
import { PdfLibRendererAdapter } from "./infrastructure/pdf/pdf-lib/pdf-lib-renderer.adapter";
import { NullInvoicePdfModelAdapter } from "./infrastructure/invoices/null-invoice-pdf-model.adapter";
import { ID_GENERATOR_TOKEN, type IdGeneratorPort } from "../../shared/ports/id-generator.port";
import { CLOCK_PORT_TOKEN, type ClockPort } from "../../shared/ports/clock.port";
import { OUTBOX_PORT } from "@corely/kernel";
import type { OutboxPort } from "@corely/kernel";
import { NestLoggerAdapter } from "../../shared/adapters/logger/nest-logger.adapter";
import { IdentityModule } from "../identity";
import { KernelModule } from "../../shared/kernel/kernel.module";

import {
  INVOICE_PDF_MODEL_PORT,
  InvoicePdfModelPort,
} from "../invoices/application/ports/invoice-pdf-model.port";
import { CompleteUploadUseCase } from "./application/use-cases/complete-upload/complete-upload.usecase";
import { CreateUploadIntentUseCase } from "./application/use-cases/create-upload-intent/create-upload-intent.usecase";
import { GenerateInvoicePdfWorker } from "./application/use-cases/generate-invoice-pdf-worker/generate-invoice-pdf.worker";
import { GetDownloadUrlUseCase } from "./application/use-cases/get-download-url/get-download-url.usecase";
import { LinkDocumentUseCase } from "./application/use-cases/link-document/link-document.usecase";
import { RequestInvoicePdfUseCase } from "./application/use-cases/request-invoice-pdf/request-invoice-pdf.usecase";

@Module({
  imports: [IdentityModule, KernelModule],
  controllers: [DocumentsController, InvoicePdfController],
  providers: [
    PrismaDocumentRepoAdapter,
    PrismaFileRepoAdapter,
    PrismaDocumentLinkAdapter,
    PdfLibRendererAdapter,
    {
      provide: GcsObjectStorageAdapter,
      useFactory: (env: EnvService) => {
        const client = createGcsClient({
          projectId: env.GOOGLE_CLOUD_PROJECT,
          keyFilename: env.GOOGLE_APPLICATION_CREDENTIALS,
        });
        return new GcsObjectStorageAdapter(client, env.STORAGE_BUCKET);
      },
      inject: [EnvService],
    },
    { provide: INVOICE_PDF_MODEL_PORT, useClass: NullInvoicePdfModelAdapter },
    {
      provide: CreateUploadIntentUseCase,
      useFactory: (
        documentRepo: PrismaDocumentRepoAdapter,
        fileRepo: PrismaFileRepoAdapter,
        storage: GcsObjectStorageAdapter,
        idGen: IdGeneratorPort,
        clock: ClockPort,
        env: EnvService
      ) =>
        new CreateUploadIntentUseCase({
          logger: new NestLoggerAdapter(),
          documentRepo,
          fileRepo,
          objectStorage: storage,
          idGenerator: idGen,
          clock,
          uploadTtlSeconds: env.SIGNED_URL_UPLOAD_TTL_SECONDS,
          keyPrefix: env.STORAGE_KEY_PREFIX,
          maxUploadBytes: env.MAX_UPLOAD_BYTES,
        }),
      inject: [
        PrismaDocumentRepoAdapter,
        PrismaFileRepoAdapter,
        GcsObjectStorageAdapter,
        ID_GENERATOR_TOKEN,
        CLOCK_PORT_TOKEN,
        EnvService,
      ],
    },
    {
      provide: CompleteUploadUseCase,
      useFactory: (
        documentRepo: PrismaDocumentRepoAdapter,
        fileRepo: PrismaFileRepoAdapter,
        storage: GcsObjectStorageAdapter,
        clock: ClockPort
      ) =>
        new CompleteUploadUseCase({
          logger: new NestLoggerAdapter(),
          documentRepo,
          fileRepo,
          objectStorage: storage,
          clock,
        }),
      inject: [
        PrismaDocumentRepoAdapter,
        PrismaFileRepoAdapter,
        GcsObjectStorageAdapter,
        CLOCK_PORT_TOKEN,
      ],
    },
    {
      provide: GetDownloadUrlUseCase,
      useFactory: (
        documentRepo: PrismaDocumentRepoAdapter,
        fileRepo: PrismaFileRepoAdapter,
        storage: GcsObjectStorageAdapter,
        env: EnvService
      ) =>
        new GetDownloadUrlUseCase({
          logger: new NestLoggerAdapter(),
          documentRepo,
          fileRepo,
          objectStorage: storage,
          downloadTtlSeconds: env.SIGNED_URL_DOWNLOAD_TTL_SECONDS,
        }),
      inject: [
        PrismaDocumentRepoAdapter,
        PrismaFileRepoAdapter,
        GcsObjectStorageAdapter,
        EnvService,
      ],
    },
    {
      provide: LinkDocumentUseCase,
      useFactory: (documentRepo: PrismaDocumentRepoAdapter, linkRepo: PrismaDocumentLinkAdapter) =>
        new LinkDocumentUseCase({
          logger: new NestLoggerAdapter(),
          documentRepo,
          linkRepo,
        }),
      inject: [PrismaDocumentRepoAdapter, PrismaDocumentLinkAdapter],
    },
    {
      provide: RequestInvoicePdfUseCase,
      useFactory: (
        documentRepo: PrismaDocumentRepoAdapter,
        fileRepo: PrismaFileRepoAdapter,
        linkRepo: PrismaDocumentLinkAdapter,
        storage: GcsObjectStorageAdapter,
        outbox: OutboxPort,
        idGen: IdGeneratorPort,
        clock: ClockPort,
        env: EnvService
      ) =>
        new RequestInvoicePdfUseCase({
          logger: new NestLoggerAdapter(),
          documentRepo,
          fileRepo,
          linkRepo,
          objectStorage: storage,
          outbox,
          idGenerator: idGen,
          clock,
          downloadTtlSeconds: env.SIGNED_URL_DOWNLOAD_TTL_SECONDS,
          keyPrefix: env.STORAGE_KEY_PREFIX,
        }),
      inject: [
        PrismaDocumentRepoAdapter,
        PrismaFileRepoAdapter,
        PrismaDocumentLinkAdapter,
        GcsObjectStorageAdapter,
        OUTBOX_PORT,
        ID_GENERATOR_TOKEN,
        CLOCK_PORT_TOKEN,
        EnvService,
      ],
    },
    {
      provide: GenerateInvoicePdfWorker,
      useFactory: (
        documentRepo: PrismaDocumentRepoAdapter,
        fileRepo: PrismaFileRepoAdapter,
        storage: GcsObjectStorageAdapter,
        pdfRenderer: PdfLibRendererAdapter,
        invoiceModel: InvoicePdfModelPort
      ) =>
        new GenerateInvoicePdfWorker({
          logger: new NestLoggerAdapter(),
          documentRepo,
          fileRepo,
          objectStorage: storage,
          pdfRenderer,
          invoicePdfModel: invoiceModel,
        }),
      inject: [
        PrismaDocumentRepoAdapter,
        PrismaFileRepoAdapter,
        GcsObjectStorageAdapter,
        PdfLibRendererAdapter,
        INVOICE_PDF_MODEL_PORT,
      ],
    },
    {
      provide: DocumentsApplication,
      useFactory: (
        createUploadIntent: CreateUploadIntentUseCase,
        completeUpload: CompleteUploadUseCase,
        getDownloadUrl: GetDownloadUrlUseCase,
        linkDocument: LinkDocumentUseCase,
        requestInvoicePdf: RequestInvoicePdfUseCase,
        generateInvoicePdfWorker: GenerateInvoicePdfWorker
      ) =>
        new DocumentsApplication(
          createUploadIntent,
          completeUpload,
          getDownloadUrl,
          linkDocument,
          requestInvoicePdf,
          generateInvoicePdfWorker
        ),
      inject: [
        CreateUploadIntentUseCase,
        CompleteUploadUseCase,
        GetDownloadUrlUseCase,
        LinkDocumentUseCase,
        RequestInvoicePdfUseCase,
        GenerateInvoicePdfWorker,
      ],
    },
  ],
  exports: [DocumentsApplication, GenerateInvoicePdfWorker, GcsObjectStorageAdapter],
})
export class DocumentsModule {}
