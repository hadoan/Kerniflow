import { Module } from "@nestjs/common";
import { DocumentsController } from "./adapters/http/documents.controller";
import { InvoicePdfController } from "./adapters/http/invoice-pdf.controller";
import { DocumentsApplication } from "./application/documents.application";
import { PrismaDocumentRepoAdapter } from "./infra/prisma/prisma-document-repo.adapter";
import { PrismaFileRepoAdapter } from "./infra/prisma/prisma-file-repo.adapter";
import { PrismaDocumentLinkAdapter } from "./infra/prisma/prisma-document-link.adapter";
import { GcsObjectStorageAdapter } from "./infra/storage/gcs/gcs-object-storage.adapter";
import { createGcsClient } from "./infra/storage/gcs/gcs.client";
import { PdfLibRendererAdapter } from "./infra/pdf/pdf-lib/pdf-lib-renderer.adapter";
import { NullInvoicePdfModelAdapter } from "./infra/invoices/null-invoice-pdf-model.adapter";
import { SystemIdGenerator } from "../../shared/infrastructure/system-id-generator";
import { SystemClock } from "../../shared/infrastructure/system-clock";
import { ID_GENERATOR_TOKEN } from "../../shared/ports/id-generator.port";
import { CLOCK_PORT_TOKEN } from "../../shared/ports/clock.port";
import { OutboxPort, OUTBOX_PORT_TOKEN } from "../../shared/ports/outbox.port";
import { PrismaOutboxAdapter } from "../../shared/infrastructure/persistence/prisma-outbox.adapter";
import { NestLoggerAdapter } from "../../shared/adapters/logger/nest-logger.adapter";
import { IdentityModule } from "../identity";
import { CreateUploadIntentUseCase } from "./application/use-cases/create-upload-intent/CreateUploadIntentUseCase";
import { CompleteUploadUseCase } from "./application/use-cases/complete-upload/CompleteUploadUseCase";
import { GetDownloadUrlUseCase } from "./application/use-cases/get-download-url/GetDownloadUrlUseCase";
import { LinkDocumentUseCase } from "./application/use-cases/link-document/LinkDocumentUseCase";
import { RequestInvoicePdfUseCase } from "./application/use-cases/request-invoice-pdf/RequestInvoicePdfUseCase";
import { GenerateInvoicePdfWorker } from "./application/use-cases/generate-invoice-pdf-worker/GenerateInvoicePdfWorker";
import {
  INVOICE_PDF_MODEL_PORT,
  InvoicePdfModelPort,
} from "../invoices/application/ports/invoice-pdf-model.port";

const uploadTtlSeconds = Number(process.env.SIGNED_URL_UPLOAD_TTL_SECONDS ?? 600);
const downloadTtlSeconds = Number(process.env.SIGNED_URL_DOWNLOAD_TTL_SECONDS ?? 600);
const storageBucket = process.env.STORAGE_BUCKET ?? "uploads";
const keyPrefix = process.env.STORAGE_KEY_PREFIX;
const maxUploadBytes = process.env.MAX_UPLOAD_BYTES
  ? Number(process.env.MAX_UPLOAD_BYTES)
  : undefined;

@Module({
  imports: [IdentityModule],
  controllers: [DocumentsController, InvoicePdfController],
  providers: [
    PrismaDocumentRepoAdapter,
    PrismaFileRepoAdapter,
    PrismaDocumentLinkAdapter,
    SystemIdGenerator,
    SystemClock,
    PrismaOutboxAdapter,
    PdfLibRendererAdapter,
    {
      provide: GcsObjectStorageAdapter,
      useFactory: () => {
        const client = createGcsClient();
        return new GcsObjectStorageAdapter(client, storageBucket);
      },
    },
    { provide: OUTBOX_PORT_TOKEN, useExisting: PrismaOutboxAdapter },
    { provide: ID_GENERATOR_TOKEN, useExisting: SystemIdGenerator },
    { provide: CLOCK_PORT_TOKEN, useExisting: SystemClock },
    { provide: INVOICE_PDF_MODEL_PORT, useClass: NullInvoicePdfModelAdapter },
    {
      provide: CreateUploadIntentUseCase,
      useFactory: (
        documentRepo: PrismaDocumentRepoAdapter,
        fileRepo: PrismaFileRepoAdapter,
        storage: GcsObjectStorageAdapter,
        idGen: SystemIdGenerator,
        clock: SystemClock
      ) =>
        new CreateUploadIntentUseCase({
          logger: new NestLoggerAdapter(),
          documentRepo,
          fileRepo,
          objectStorage: storage,
          idGenerator: idGen,
          clock,
          uploadTtlSeconds,
          keyPrefix,
          maxUploadBytes,
        }),
      inject: [
        PrismaDocumentRepoAdapter,
        PrismaFileRepoAdapter,
        GcsObjectStorageAdapter,
        ID_GENERATOR_TOKEN,
        CLOCK_PORT_TOKEN,
      ],
    },
    {
      provide: CompleteUploadUseCase,
      useFactory: (
        documentRepo: PrismaDocumentRepoAdapter,
        fileRepo: PrismaFileRepoAdapter,
        storage: GcsObjectStorageAdapter,
        clock: SystemClock
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
        storage: GcsObjectStorageAdapter
      ) =>
        new GetDownloadUrlUseCase({
          logger: new NestLoggerAdapter(),
          documentRepo,
          fileRepo,
          objectStorage: storage,
          downloadTtlSeconds,
        }),
      inject: [PrismaDocumentRepoAdapter, PrismaFileRepoAdapter, GcsObjectStorageAdapter],
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
        idGen: SystemIdGenerator,
        clock: SystemClock
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
          downloadTtlSeconds,
          keyPrefix,
        }),
      inject: [
        PrismaDocumentRepoAdapter,
        PrismaFileRepoAdapter,
        PrismaDocumentLinkAdapter,
        GcsObjectStorageAdapter,
        OUTBOX_PORT_TOKEN,
        ID_GENERATOR_TOKEN,
        CLOCK_PORT_TOKEN,
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
  exports: [DocumentsApplication, GenerateInvoicePdfWorker],
})
export class DocumentsModule {}
