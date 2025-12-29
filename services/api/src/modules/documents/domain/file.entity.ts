import { type FileKind, type StorageProvider } from "./document.types";

type FileProps = {
  id: string;
  tenantId: string;
  documentId: string;
  kind: FileKind;
  storageProvider: StorageProvider;
  bucket: string;
  objectKey: string;
  contentType?: string | null;
  sizeBytes?: number | null;
  sha256?: string | null;
  createdAt: Date;
};

export class FileEntity {
  id: string;
  tenantId: string;
  documentId: string;
  kind: FileKind;
  storageProvider: StorageProvider;
  bucket: string;
  objectKey: string;
  contentType?: string | null;
  sizeBytes?: number | null;
  sha256?: string | null;
  createdAt: Date;

  constructor(props: FileProps) {
    this.id = props.id;
    this.tenantId = props.tenantId;
    this.documentId = props.documentId;
    this.kind = props.kind;
    this.storageProvider = props.storageProvider;
    this.bucket = props.bucket;
    this.objectKey = props.objectKey;
    this.contentType = props.contentType ?? null;
    this.sizeBytes = props.sizeBytes ?? null;
    this.sha256 = props.sha256 ?? null;
    this.createdAt = props.createdAt;
  }

  markUploaded(metadata: {
    sizeBytes?: number | null;
    contentType?: string | null;
    sha256?: string | null;
  }) {
    if (metadata.sizeBytes !== undefined) {
      this.sizeBytes = metadata.sizeBytes;
    }
    if (metadata.contentType !== undefined) {
      this.contentType = metadata.contentType;
    }
    if (metadata.sha256 !== undefined) {
      this.sha256 = metadata.sha256;
    }
  }
}
