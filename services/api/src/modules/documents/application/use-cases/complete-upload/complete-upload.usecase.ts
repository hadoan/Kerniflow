import {
  BaseUseCase,
  type ClockPort,
  type LoggerPort,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ValidationError,
  NotFoundError,
  err,
  ok,
} from "@kerniflow/kernel";
import { type CompleteUploadInput, type CompleteUploadOutput } from "@kerniflow/contracts";
import { type DocumentRepoPort } from "../../ports/document-repository.port";
import { type FileRepoPort } from "../../ports/file-repository.port";
import { type ObjectStoragePort } from "../../ports/object-storage.port";
import { toDocumentDto, toFileDto } from "../../mappers/document.mapper";

type Deps = {
  logger: LoggerPort;
  documentRepo: DocumentRepoPort;
  fileRepo: FileRepoPort;
  objectStorage: ObjectStoragePort;
  clock: ClockPort;
};

export class CompleteUploadUseCase extends BaseUseCase<CompleteUploadInput, CompleteUploadOutput> {
  constructor(private readonly useCaseDeps: Deps) {
    super({ logger: useCaseDeps.logger });
  }

  protected validate(input: CompleteUploadInput): CompleteUploadInput {
    if (!input.documentId) {
      throw new ValidationError("documentId is required");
    }
    if (!input.fileId) {
      throw new ValidationError("fileId is required");
    }
    return input;
  }

  protected async handle(
    input: CompleteUploadInput,
    ctx: UseCaseContext
  ): Promise<Result<CompleteUploadOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId missing from context"));
    }

    const document = await this.useCaseDeps.documentRepo.findById(ctx.tenantId, input.documentId);
    if (!document) {
      return err(new NotFoundError("Document not found"));
    }
    const file = await this.useCaseDeps.fileRepo.findById(ctx.tenantId, input.fileId);
    if (!file || file.documentId !== document.id) {
      return err(new NotFoundError("File not found on document"));
    }

    const head = await this.useCaseDeps.objectStorage.headObject({
      tenantId: ctx.tenantId,
      objectKey: file.objectKey,
    });
    if (!head.exists) {
      return err(new NotFoundError("Uploaded object not found"));
    }

    file.markUploaded({
      sizeBytes: input.sizeBytes ?? head.sizeBytes ?? null,
      contentType: head.contentType ?? file.contentType ?? null,
      sha256: input.sha256 ?? file.sha256 ?? null,
    });
    document.markReady(this.useCaseDeps.clock.now());

    await this.useCaseDeps.fileRepo.save(file);
    await this.useCaseDeps.documentRepo.save(document);

    return ok({
      document: toDocumentDto(document),
      file: toFileDto(file),
    });
  }
}
