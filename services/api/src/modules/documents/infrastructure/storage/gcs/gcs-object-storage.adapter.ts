import { Injectable } from "@nestjs/common";
import {
  ObjectStoragePort,
  SignedDownload,
  SignedUpload,
} from "../../../application/ports/object-storage.port";
import { GcsClient } from "./gcs.client";

@Injectable()
export class GcsObjectStorageAdapter implements ObjectStoragePort {
  constructor(
    private readonly client: GcsClient,
    private readonly bucketName: string
  ) {}

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
    const expires = Date.now() + args.expiresInSeconds * 1000;
    const [url] = await this.client.bucket(this.bucketName).file(args.objectKey).getSignedUrl({
      version: "v4",
      action: "write",
      expires,
      contentType: args.contentType,
    });
    return {
      url,
      method: "PUT",
      requiredHeaders: { "content-type": args.contentType },
      expiresAt: new Date(expires),
    };
  }

  async createSignedDownloadUrl(args: {
    tenantId: string;
    objectKey: string;
    expiresInSeconds: number;
  }): Promise<SignedDownload> {
    const expires = Date.now() + args.expiresInSeconds * 1000;
    const [url] = await this.client.bucket(this.bucketName).file(args.objectKey).getSignedUrl({
      version: "v4",
      action: "read",
      expires,
    });
    return { url, expiresAt: new Date(expires) };
  }

  async headObject(args: { tenantId: string; objectKey: string }) {
    const file = this.client.bucket(this.bucketName).file(args.objectKey);
    const [exists] = await file.exists();
    if (!exists) {
      return { exists: false };
    }
    const [metadata] = await file.getMetadata();
    return {
      exists: true,
      sizeBytes: metadata.size ? Number(metadata.size) : undefined,
      contentType: metadata.contentType,
      etag: metadata.etag,
    };
  }

  async putObject(args: {
    tenantId: string;
    objectKey: string;
    contentType: string;
    bytes: Buffer;
  }): Promise<{ etag?: string; sizeBytes: number }> {
    const file = this.client.bucket(this.bucketName).file(args.objectKey);
    await file.save(args.bytes, { contentType: args.contentType, resumable: false });
    const [metadata] = await file.getMetadata();
    return {
      etag: metadata.etag,
      sizeBytes: metadata.size ? Number(metadata.size) : args.bytes.length,
    };
  }
}
