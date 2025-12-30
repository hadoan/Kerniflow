import { beforeEach, describe, expect, it } from "vitest";
import { CompleteUploadUseCase } from "./complete-upload.usecase";
import { InMemoryDocumentRepo } from "../../../testkit/fakes/in-memory-document-repo";
import { InMemoryFileRepo } from "../../../testkit/fakes/in-memory-file-repo";
import { FakeObjectStoragePort } from "../../../testkit/fakes/fake-object-storage";
import { DocumentAggregate } from "../../../domain/document.aggregate";
import { FixedClock, NoopLogger, unwrap, isErr } from "@corely/kernel";

describe("CompleteUploadUseCase", () => {
  let documentRepo: InMemoryDocumentRepo;
  let fileRepo: InMemoryFileRepo;
  let storage: FakeObjectStoragePort;
  let clock: FixedClock;
  let useCase: CompleteUploadUseCase;

  beforeEach(() => {
    documentRepo = new InMemoryDocumentRepo();
    fileRepo = new InMemoryFileRepo();
    storage = new FakeObjectStoragePort();
    clock = new FixedClock(new Date("2025-01-01T00:00:00.000Z"));
    useCase = new CompleteUploadUseCase({
      logger: new NoopLogger(),
      documentRepo,
      fileRepo,
      objectStorage: storage,
      clock,
    });
  });

  it("fails when uploaded object is missing", async () => {
    const doc = DocumentAggregate.create({
      id: "doc-1",
      tenantId: "tenant-1",
      type: "UPLOAD",
      createdAt: clock.now(),
      file: {
        id: "file-1",
        kind: "ORIGINAL",
        storageProvider: storage.provider(),
        bucket: storage.bucket(),
        objectKey: "env/test/object.txt",
        contentType: "text/plain",
        createdAt: clock.now(),
      },
    });
    await documentRepo.create(doc);
    await fileRepo.create(doc.files[0]);

    const result = await useCase.execute(
      { documentId: doc.id, fileId: doc.files[0].id },
      { tenantId: "tenant-1" }
    );

    expect(isErr(result)).toBe(true);
  });

  it("marks document ready and updates metadata when object exists", async () => {
    const doc = DocumentAggregate.create({
      id: "doc-2",
      tenantId: "tenant-1",
      type: "UPLOAD",
      createdAt: clock.now(),
      file: {
        id: "file-2",
        kind: "ORIGINAL",
        storageProvider: storage.provider(),
        bucket: storage.bucket(),
        objectKey: "env/test/object.txt",
        contentType: "text/plain",
        createdAt: clock.now(),
      },
    });
    await documentRepo.create(doc);
    await fileRepo.create(doc.files[0]);
    storage.objects.set(doc.files[0].objectKey, {
      key: doc.files[0].objectKey,
      contentType: "text/plain",
      bytes: Buffer.from("hello world"),
    });

    const result = unwrap(
      await useCase.execute(
        { documentId: doc.id, fileId: doc.files[0].id },
        { tenantId: "tenant-1" }
      )
    );

    expect(result.document.status).toBe("READY");
    expect(result.file.sizeBytes).toBe(11);
    expect(result.file.contentType).toBe("text/plain");
  });
});
