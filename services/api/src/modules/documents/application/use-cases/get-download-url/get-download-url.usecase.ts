import {
  BaseUseCase,
  type LoggerPort,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ValidationError,
  NotFoundError,
  err,
  ok,
} from "@kerniflow/kernel";
import { type GetDownloadUrlInput, type GetDownloadUrlOutput } from "@kerniflow/contracts";
import { type DocumentRepoPort } from "../../ports/document-repository.port";
import { type FileRepoPort } from "../../ports/file-repository.port";
import { type ObjectStoragePort } from "../../ports/object-storage.port";

type Deps = {
  logger: LoggerPort;
  documentRepo: DocumentRepoPort;
  fileRepo: FileRepoPort;
  objectStorage: ObjectStoragePort;
  downloadTtlSeconds: number;
};

export class GetDownloadUrlUseCase extends BaseUseCase<GetDownloadUrlInput, GetDownloadUrlOutput> {
  constructor(private readonly useCaseDeps: Deps) {
    super({ logger: useCaseDeps.logger });
  }

  protected validate(input: GetDownloadUrlInput): GetDownloadUrlInput {
    if (!input.documentId) {
      throw new ValidationError("documentId is required");
    }
    return input;
  }

  protected async handle(
    input: GetDownloadUrlInput,
    ctx: UseCaseContext
  ): Promise<Result<GetDownloadUrlOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId missing from context"));
    }

    const document = await this.useCaseDeps.documentRepo.findById(ctx.tenantId, input.documentId);
    if (!document) {
      return err(new NotFoundError("Document not found"));
    }

    let fileId = input.fileId;
    if (!fileId) {
      const files = await this.useCaseDeps.fileRepo.findByDocument(ctx.tenantId, document.id);
      const preferred = files.find((f) => f.kind === "GENERATED") ?? files[0];
      fileId = preferred?.id;
    }

    if (!fileId) {
      return err(new NotFoundError("File not found for document"));
    }

    const file = await this.useCaseDeps.fileRepo.findById(ctx.tenantId, fileId);
    if (!file || file.documentId !== document.id) {
      return err(new NotFoundError("File not found for document"));
    }

    const signed = await this.useCaseDeps.objectStorage.createSignedDownloadUrl({
      tenantId: ctx.tenantId,
      objectKey: file.objectKey,
      expiresInSeconds: this.useCaseDeps.downloadTtlSeconds,
    });

    return ok({ url: signed.url, expiresAt: signed.expiresAt.toISOString() });
  }
}
