import {
  BaseUseCase,
  type ClockPort,
  type IdGeneratorPort,
  type LoggerPort,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ValidationError,
  err,
  ok,
} from "@corely/kernel";
import { type CreateUploadIntentInput, type CreateUploadIntentOutput } from "@corely/contracts";
import { type DocumentRepoPort } from "../../ports/document-repository.port";
import { type FileRepoPort } from "../../ports/file-repository.port";
import { type ObjectStoragePort } from "../../ports/object-storage.port";
import { DocumentAggregate } from "../../../domain/document.aggregate";
import { type FileKind } from "../../../domain/document.types";
import { toDocumentDto, toFileDto } from "../../mappers/document.mapper";

type Deps = {
  logger: LoggerPort;
  documentRepo: DocumentRepoPort;
  fileRepo: FileRepoPort;
  objectStorage: ObjectStoragePort;
  idGenerator: IdGeneratorPort;
  clock: ClockPort;
  uploadTtlSeconds: number;
  keyPrefix?: string;
  maxUploadBytes?: number;
};

const DEFAULT_MAX_UPLOAD = 50 * 1024 * 1024;

export class CreateUploadIntentUseCase extends BaseUseCase<
  CreateUploadIntentInput,
  CreateUploadIntentOutput
> {
  constructor(private readonly useCaseDeps: Deps) {
    super({ logger: useCaseDeps.logger });
  }

  protected validate(input: CreateUploadIntentInput): CreateUploadIntentInput {
    if (!input.filename.trim()) {
      throw new ValidationError("filename is required");
    }
    if (!input.contentType.trim()) {
      throw new ValidationError("contentType is required");
    }
    if (input.sizeBytes !== undefined && input.sizeBytes < 0) {
      throw new ValidationError("sizeBytes must be non-negative");
    }
    const maxSize = this.useCaseDeps.maxUploadBytes ?? DEFAULT_MAX_UPLOAD;
    if (input.sizeBytes && input.sizeBytes > maxSize) {
      throw new ValidationError("File too large");
    }
    return input;
  }

  protected async handle(
    input: CreateUploadIntentInput,
    ctx: UseCaseContext
  ): Promise<Result<CreateUploadIntentOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId missing from context"));
    }

    const now = this.useCaseDeps.clock.now();
    const documentId = this.useCaseDeps.idGenerator.newId();
    const fileId = this.useCaseDeps.idGenerator.newId();
    const safeFilename = sanitizeFilename(input.filename);
    const prefix =
      this.useCaseDeps.keyPrefix ??
      process.env.STORAGE_KEY_PREFIX ??
      `env/${process.env.NODE_ENV ?? "dev"}`;
    const objectKey = `${prefix}/tenant/${ctx.tenantId}/documents/${documentId}/files/${fileId}/${safeFilename}`;

    const document = DocumentAggregate.create({
      id: documentId,
      tenantId: ctx.tenantId,
      type: input.documentType ?? "UPLOAD",
      createdAt: now,
      file: {
        id: fileId,
        kind: "ORIGINAL" as FileKind,
        storageProvider: this.useCaseDeps.objectStorage.provider(),
        bucket: this.useCaseDeps.objectStorage.bucket(),
        objectKey,
        contentType: input.contentType,
        sizeBytes: input.sizeBytes ?? null,
        sha256: input.sha256 ?? null,
        createdAt: now,
      },
    });

    await this.useCaseDeps.documentRepo.create(document);
    const file = document.files[0];
    await this.useCaseDeps.fileRepo.create(file);

    const expiresInSeconds = Math.min(
      input.ttlSeconds ?? this.useCaseDeps.uploadTtlSeconds,
      this.useCaseDeps.uploadTtlSeconds
    );
    const signedUpload = await this.useCaseDeps.objectStorage.createSignedUploadUrl({
      tenantId: ctx.tenantId,
      objectKey,
      contentType: input.contentType,
      expiresInSeconds,
    });

    return ok({
      document: toDocumentDto(document),
      file: toFileDto(file),
      upload: {
        ...signedUpload,
        mode: "single_put" as const,
        requiredHeaders: signedUpload.requiredHeaders ?? { "content-type": input.contentType },
        expiresAt: signedUpload.expiresAt.toISOString(),
      },
    });
  }
}

const sanitizeFilename = (filename: string) => filename.replace(/[^a-zA-Z0-9._-]/g, "_");
