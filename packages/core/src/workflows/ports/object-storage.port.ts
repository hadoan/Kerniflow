export interface ObjectStoragePort {
  putObject(input: {
    key: string;
    contentType?: string;
    body: Buffer | string;
    metadata?: Record<string, string>;
  }): Promise<{ key: string; url?: string }>;

  getSignedUrl(input: { key: string; expiresInSeconds: number }): Promise<{ url: string }>;
}
