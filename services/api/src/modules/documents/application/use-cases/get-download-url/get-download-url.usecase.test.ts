import { beforeEach, describe, expect, it } from "vitest";
import { GetDownloadUrlUseCase } from "./get-download-url.usecase";
import { InMemoryDocumentRepo } from "../../../testkit/fakes/in-memory-document-repo";
import { InMemoryFileRepo } from "../../../testkit/fakes/in-memory-file-repo";
import { FakeObjectStoragePort } from "../../../testkit/fakes/fake-object-storage";
import { DocumentAggregate } from "../../../domain/document.aggregate";
import { NoopLogger, unwrap } from "@corely/kernel";

describe("GetDownloadUrlUseCase", () => {
  let documentRepo: InMemoryDocumentRepo;
  let fileRepo: InMemoryFileRepo;
  let storage: FakeObjectStoragePort;
  let useCase: GetDownloadUrlUseCase;

  beforeEach(() => {
    documentRepo = new InMemoryDocumentRepo();
    fileRepo = new InMemoryFileRepo();
    storage = new FakeObjectStoragePort();
    useCase = new GetDownloadUrlUseCase({
      logger: new NoopLogger(),
      documentRepo,
      fileRepo,
      objectStorage: storage,
      downloadTtlSeconds: 600,
    });
  });

  it("returns download URL for preferred generated file", async () => {
    const now = new Date("2025-01-01T00:00:00.000Z");
    const doc = DocumentAggregate.create({
      id: "doc-1",
      tenantId: "tenant-1",
      type: "INVOICE_PDF",
      createdAt: now,
      status: "READY",
      file: {
        id: "file-original",
        kind: "ORIGINAL",
        storageProvider: storage.provider(),
        bucket: storage.bucket(),
        objectKey: "env/test/documents/doc-1/files/file-original/original.txt",
        contentType: "text/plain",
        createdAt: now,
      },
    });
    doc.addFile(
      {
        // spread to satisfy FileEntity constructor
        ...doc.files[0],
        id: "file-generated",
        kind: "GENERATED",
        objectKey: "env/test/documents/doc-1/files/file-generated/invoice.pdf",
        contentType: "application/pdf",
      } as any,
      now
    );
    await documentRepo.create(doc);
    await fileRepo.create(doc.files[0]);
    await fileRepo.create(doc.files[1]);

    const result = unwrap(await useCase.execute({ documentId: doc.id }, { tenantId: "tenant-1" }));

    expect(result.url).toContain(doc.files[1].objectKey);
    expect(new Date(result.expiresAt).getTime()).toBeGreaterThan(Date.now());
  });
});
