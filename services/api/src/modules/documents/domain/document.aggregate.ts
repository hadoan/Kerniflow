import {
  type DocumentStatus,
  type DocumentType,
  type FileKind,
  type StorageProvider,
} from "./document.types";
import { FileEntity } from "./file.entity";

type DocumentProps = {
  id: string;
  tenantId: string;
  type: DocumentType;
  status: DocumentStatus;
  title?: string | null;
  createdAt: Date;
  updatedAt: Date;
  errorMessage?: string | null;
  archivedAt?: Date | null;
  archivedByUserId?: string | null;
  files?: FileEntity[];
};

export class DocumentAggregate {
  id: string;
  tenantId: string;
  type: DocumentType;
  status: DocumentStatus;
  title?: string | null;
  createdAt: Date;
  updatedAt: Date;
  errorMessage?: string | null;
  archivedAt?: Date | null;
  archivedByUserId?: string | null;
  files: FileEntity[];

  constructor(props: DocumentProps) {
    this.id = props.id;
    this.tenantId = props.tenantId;
    this.type = props.type;
    this.status = props.status;
    this.title = props.title ?? null;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
    this.errorMessage = props.errorMessage ?? null;
    this.archivedAt = props.archivedAt ?? null;
    this.archivedByUserId = props.archivedByUserId ?? null;
    this.files = props.files ?? [];
  }

  static create(params: {
    id: string;
    tenantId: string;
    type: DocumentType;
    title?: string | null;
    createdAt: Date;
    status?: DocumentStatus;
    file?: {
      id: string;
      kind: FileKind;
      storageProvider: StorageProvider;
      bucket: string;
      objectKey: string;
      contentType?: string | null;
      sizeBytes?: number | null;
      sha256?: string | null;
      createdAt: Date;
    };
  }) {
    const files = params.file
      ? [
          new FileEntity({
            id: params.file.id,
            tenantId: params.tenantId,
            documentId: params.id,
            kind: params.file.kind,
            storageProvider: params.file.storageProvider,
            bucket: params.file.bucket,
            objectKey: params.file.objectKey,
            contentType: params.file.contentType,
            sizeBytes: params.file.sizeBytes,
            sha256: params.file.sha256,
            createdAt: params.file.createdAt,
          }),
        ]
      : [];
    return new DocumentAggregate({
      id: params.id,
      tenantId: params.tenantId,
      type: params.type,
      status: params.status ?? "PENDING",
      title: params.title ?? null,
      createdAt: params.createdAt,
      updatedAt: params.createdAt,
      archivedAt: null,
      archivedByUserId: null,
      files,
    });
  }

  archive(now: Date, userId: string) {
    if (this.archivedAt) {
      return;
    }
    this.archivedAt = now;
    this.archivedByUserId = userId;
    this.touch(now);
  }

  unarchive(now: Date) {
    this.archivedAt = null;
    this.archivedByUserId = null;
    this.touch(now);
  }

  addFile(file: FileEntity, now: Date) {
    if (file.documentId !== this.id) {
      throw new Error("Cannot attach file to different document");
    }
    if (file.tenantId !== this.tenantId) {
      throw new Error("Cannot attach cross-tenant file");
    }
    this.files.push(file);
    this.touch(now);
  }

  getFile(fileId: string): FileEntity | undefined {
    return this.files.find((f) => f.id === fileId);
  }

  markReady(now: Date) {
    this.status = "READY";
    this.errorMessage = null;
    this.touch(now);
  }

  markPending(now: Date) {
    this.status = "PENDING";
    this.touch(now);
  }

  markFailed(errorMessage: string, now: Date) {
    this.status = "FAILED";
    this.errorMessage = errorMessage;
    this.touch(now);
  }

  touch(now: Date) {
    this.updatedAt = now;
  }
}
