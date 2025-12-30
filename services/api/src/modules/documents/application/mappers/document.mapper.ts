import { type DocumentDTO, type FileDTO } from "@corely/contracts";
import { type DocumentAggregate } from "../../domain/document.aggregate";
import { type FileEntity } from "../../domain/file.entity";

export const toFileDto = (file: FileEntity): FileDTO => ({
  id: file.id,
  documentId: file.documentId,
  kind: file.kind,
  storageProvider: file.storageProvider,
  bucket: file.bucket,
  objectKey: file.objectKey,
  contentType: file.contentType ?? undefined,
  sizeBytes: file.sizeBytes ?? undefined,
  sha256: file.sha256 ?? undefined,
  createdAt: file.createdAt.toISOString(),
});

export const toDocumentDto = (document: DocumentAggregate, files?: FileEntity[]): DocumentDTO => ({
  id: document.id,
  tenantId: document.tenantId,
  type: document.type,
  status: document.status,
  title: document.title ?? undefined,
  createdAt: document.createdAt.toISOString(),
  updatedAt: document.updatedAt.toISOString(),
  files: (files ?? document.files).map(toFileDto),
});
