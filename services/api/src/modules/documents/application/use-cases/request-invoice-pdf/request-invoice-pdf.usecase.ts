import {
  BaseUseCase,
  type ClockPort,
  type IdGeneratorPort,
  type LoggerPort,
  NotFoundError,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ValidationError,
  err,
  ok,
} from "@kerniflow/kernel";
import { type RequestInvoicePdfInput, type RequestInvoicePdfOutput } from "@kerniflow/contracts";
import { type DocumentRepoPort } from "../../ports/document-repository.port";
import { type FileRepoPort } from "../../ports/file-repository.port";
import { type DocumentLinkRepoPort } from "../../ports/document-link.port";
import { type ObjectStoragePort } from "../../ports/object-storage.port";
import { type OutboxPort } from "../../ports/outbox.port";
import { DocumentAggregate } from "../../../domain/document.aggregate";
import { FileEntity } from "../../../domain/file.entity";
import { type FileKind } from "../../../domain/document.types";

type Deps = {
  logger: LoggerPort;
  documentRepo: DocumentRepoPort;
  fileRepo: FileRepoPort;
  linkRepo: DocumentLinkRepoPort;
  objectStorage: ObjectStoragePort;
  outbox: OutboxPort;
  idGenerator: IdGeneratorPort;
  clock: ClockPort;
  downloadTtlSeconds: number;
  keyPrefix?: string;
};

const EVENT_TYPE = "invoice.pdf.render.requested";

export class RequestInvoicePdfUseCase extends BaseUseCase<
  RequestInvoicePdfInput,
  RequestInvoicePdfOutput
> {
  constructor(private readonly useCaseDeps: Deps) {
    super({ logger: useCaseDeps.logger });
  }

  protected validate(input: RequestInvoicePdfInput): RequestInvoicePdfInput {
    if (!input.invoiceId) {
      throw new ValidationError("invoiceId is required");
    }
    return input;
  }

  protected async handle(
    input: RequestInvoicePdfInput,
    ctx: UseCaseContext
  ): Promise<Result<RequestInvoicePdfOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId missing from context"));
    }

    const tenantId = ctx.tenantId;
    const existing = await this.useCaseDeps.documentRepo.findByTypeAndEntityLink(
      tenantId,
      "INVOICE_PDF",
      "INVOICE",
      input.invoiceId
    );

    let document = existing;
    let file: FileEntity | null = null;

    if (document) {
      file =
        (await this.useCaseDeps.fileRepo.findByDocumentAndKind(
          tenantId,
          document.id,
          "GENERATED"
        )) ??
        (await this.useCaseDeps.fileRepo.findByDocument(tenantId, document.id)).find(
          (f) => f.kind === "GENERATED"
        ) ??
        null;
    }

    if (document && !input.forceRegenerate && document.status === "READY" && file) {
      const signed = await this.useCaseDeps.objectStorage.createSignedDownloadUrl({
        tenantId,
        objectKey: file.objectKey,
        expiresInSeconds: this.useCaseDeps.downloadTtlSeconds,
      });
      return ok({
        documentId: document.id,
        status: "READY",
        fileId: file.id,
        downloadUrl: signed.url,
        expiresAt: signed.expiresAt.toISOString(),
      });
    }

    if (!document) {
      const now = this.useCaseDeps.clock.now();
      const documentId = this.useCaseDeps.idGenerator.newId();
      const fileId = this.useCaseDeps.idGenerator.newId();
      const prefix =
        this.useCaseDeps.keyPrefix ??
        process.env.STORAGE_KEY_PREFIX ??
        `env/${process.env.NODE_ENV ?? "dev"}`;
      const objectKey = `${prefix}/tenant/${tenantId}/documents/${documentId}/files/${fileId}/invoice.pdf`;

      document = DocumentAggregate.create({
        id: documentId,
        tenantId,
        type: "INVOICE_PDF",
        createdAt: now,
        file: {
          id: fileId,
          kind: "GENERATED" as FileKind,
          storageProvider: this.useCaseDeps.objectStorage.provider(),
          bucket: this.useCaseDeps.objectStorage.bucket(),
          objectKey,
          contentType: "application/pdf",
          createdAt: now,
        },
      });
      file = document.files[0];
      await this.useCaseDeps.documentRepo.create(document);
      await this.useCaseDeps.fileRepo.create(file);
      await this.useCaseDeps.linkRepo.createLink({
        tenantId,
        documentId: document.id,
        entityType: "INVOICE",
        entityId: input.invoiceId,
      });
    } else {
      const now = this.useCaseDeps.clock.now();
      if (!file) {
        const fileId = this.useCaseDeps.idGenerator.newId();
        const prefix =
          this.useCaseDeps.keyPrefix ??
          process.env.STORAGE_KEY_PREFIX ??
          `env/${process.env.NODE_ENV ?? "dev"}`;
        const objectKey = `${prefix}/tenant/${tenantId}/documents/${document.id}/files/${fileId}/invoice.pdf`;
        file = new FileEntity({
          id: fileId,
          tenantId,
          documentId: document.id,
          kind: "GENERATED",
          storageProvider: this.useCaseDeps.objectStorage.provider(),
          bucket: this.useCaseDeps.objectStorage.bucket(),
          objectKey,
          contentType: "application/pdf",
          createdAt: now,
        });
        document.addFile(file, now);
        await this.useCaseDeps.fileRepo.create(file);
      } else if (!file.contentType) {
        file.markUploaded({ contentType: "application/pdf" });
        await this.useCaseDeps.fileRepo.save(file);
      }
      document.markPending(now);
      await this.useCaseDeps.documentRepo.save(document);
    }

    if (!file) {
      return err(new NotFoundError("File not found for invoice PDF"));
    }

    await this.useCaseDeps.outbox.enqueue({
      eventType: EVENT_TYPE,
      payload: {
        invoiceId: input.invoiceId,
        documentId: document.id,
        fileId: file.id,
      },
      tenantId,
      correlationId: ctx.correlationId,
    });

    return ok({
      documentId: document.id,
      status: "PENDING",
      fileId: file.id,
    });
  }
}
