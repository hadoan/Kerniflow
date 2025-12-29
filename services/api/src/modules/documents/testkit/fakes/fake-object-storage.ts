import {
  type ObjectStoragePort,
  type SignedDownload,
  type SignedUpload,
} from "../../application/ports/object-storage.port";

type StoredObject = { key: string; contentType: string; bytes: Buffer };

export class FakeObjectStoragePort implements ObjectStoragePort {
  bucketName = "fake-bucket";
  objects = new Map<string, StoredObject>();

  provider(): "gcs" {
    return "gcs";
  }

  bucket(): string {
    return this.bucketName;
  }

  async createSignedUploadUrl(args: {
    tenantId: string;
    objectKey: string;
    contentType: string;
    expiresInSeconds: number;
  }): Promise<SignedUpload> {
    return {
      url: `https://upload.test/${args.objectKey}`,
      method: "PUT",
      requiredHeaders: { "content-type": args.contentType },
      expiresAt: new Date(Date.now() + args.expiresInSeconds * 1000),
    };
  }

  async createSignedDownloadUrl(args: {
    tenantId: string;
    objectKey: string;
    expiresInSeconds: number;
  }): Promise<SignedDownload> {
    return {
      url: `https://download.test/${args.objectKey}`,
      expiresAt: new Date(Date.now() + args.expiresInSeconds * 1000),
    };
  }

  async headObject(args: { tenantId: string; objectKey: string }) {
    const stored = this.objects.get(args.objectKey);
    if (!stored) {
      return { exists: false };
    }
    return { exists: true, sizeBytes: stored.bytes.length, contentType: stored.contentType };
  }

  async putObject(args: {
    tenantId: string;
    objectKey: string;
    contentType: string;
    bytes: Buffer;
  }): Promise<{ etag?: string | undefined; sizeBytes: number }> {
    this.objects.set(args.objectKey, {
      key: args.objectKey,
      contentType: args.contentType,
      bytes: args.bytes,
    });
    return { sizeBytes: args.bytes.length };
  }
}
