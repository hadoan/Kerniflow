import { beforeEach, describe, expect, it } from "vitest";
import { CreateUploadIntentUseCase } from "./create-upload-intent.usecase";
import { InMemoryDocumentRepo } from "../../../testkit/fakes/in-memory-document-repo";
import { InMemoryFileRepo } from "../../../testkit/fakes/in-memory-file-repo";
import { FakeObjectStoragePort } from "../../../testkit/fakes/fake-object-storage";
import { CompleteUploadUseCase } from "../complete-upload/complete-upload.usecase";
import { FixedClock, NoopLogger, unwrap, isErr } from "@corely/kernel";

class TestIdGenerator {
  private counter = 0;
  newId() {
    this.counter += 1;
    return `id-${this.counter}`;
  }
}

describe("Documents upload flow", () => {
  let documentRepo: InMemoryDocumentRepo;
  let fileRepo: InMemoryFileRepo;
  let storage: FakeObjectStoragePort;
  let idGen: TestIdGenerator;
  let clock: FixedClock;
  let createUpload: CreateUploadIntentUseCase;
  let completeUpload: CompleteUploadUseCase;

  beforeEach(() => {
    documentRepo = new InMemoryDocumentRepo();
    fileRepo = new InMemoryFileRepo();
    storage = new FakeObjectStoragePort();
    idGen = new TestIdGenerator();
    clock = new FixedClock(new Date("2025-01-01T00:00:00.000Z"));
    createUpload = new CreateUploadIntentUseCase({
      logger: new NoopLogger(),
      documentRepo,
      fileRepo,
      objectStorage: storage,
      idGenerator: idGen,
      clock,
      uploadTtlSeconds: 600,
      keyPrefix: "env/test",
    });
    completeUpload = new CompleteUploadUseCase({
      logger: new NoopLogger(),
      documentRepo,
      fileRepo,
      objectStorage: storage,
      clock,
    });
  });

  it("creates document and file with GCS object key prefix", async () => {
    const result = unwrap(
      await createUpload.execute(
        {
          filename: "invoice.pdf",
          contentType: "application/pdf",
        },
        { tenantId: "tenant-1" }
      )
    );

    const storedDoc = await documentRepo.findById("tenant-1", result.document.id);
    expect(storedDoc).not.toBeNull();
    expect(result.file.objectKey).toContain(`tenant/tenant-1/documents/${result.document.id}/`);
    expect(result.upload.url).toContain(result.file.objectKey);
  });

  it("fails complete-upload if object missing", async () => {
    const { document, file } = unwrap(
      await createUpload.execute(
        { filename: "missing.txt", contentType: "text/plain" },
        { tenantId: "tenant-1" }
      )
    );

    const result = await completeUpload.execute(
      { documentId: document.id, fileId: file.id },
      { tenantId: "tenant-1" }
    );

    expect(isErr(result)).toBe(true);
  });

  it("marks document ready after upload exists", async () => {
    const { document, file } = unwrap(
      await createUpload.execute(
        { filename: "ready.txt", contentType: "text/plain" },
        { tenantId: "tenant-1" }
      )
    );
    storage.objects.set(file.objectKey, {
      key: file.objectKey,
      contentType: "text/plain",
      bytes: Buffer.from("hello"),
    });

    const result = unwrap(
      await completeUpload.execute(
        { documentId: document.id, fileId: file.id },
        { tenantId: "tenant-1" }
      )
    );

    expect(result.document.status).toBe("READY");
    expect(result.file.sizeBytes).toBe(5);
  });
});
