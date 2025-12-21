export type SignedUpload = {
  url: string;
  method: "PUT";
  requiredHeaders?: Record<string, string>;
  expiresAt: Date;
};

export type SignedDownload = {
  url: string;
  expiresAt: Date;
};

export type HeadObject = {
  exists: boolean;
  sizeBytes?: number;
  contentType?: string;
  etag?: string;
};

export interface ObjectStoragePort {
  provider(): "gcs" | "s3" | "azure";
  bucket(): string;
  createSignedUploadUrl(args: {
    tenantId: string;
    objectKey: string;
    contentType: string;
    expiresInSeconds: number;
  }): Promise<SignedUpload>;

  createSignedDownloadUrl(args: {
    tenantId: string;
    objectKey: string;
    expiresInSeconds: number;
  }): Promise<SignedDownload>;

  headObject(args: { tenantId: string; objectKey: string }): Promise<HeadObject>;

  putObject(args: {
    tenantId: string;
    objectKey: string;
    contentType: string;
    bytes: Buffer;
  }): Promise<{ etag?: string; sizeBytes: number }>;
}
