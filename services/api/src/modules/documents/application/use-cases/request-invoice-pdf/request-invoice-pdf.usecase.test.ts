import { beforeEach, describe, expect, it } from "vitest";
import { RequestInvoicePdfUseCase } from "./request-invoice-pdf.usecase";
import { InMemoryDocumentRepo } from "../../../testkit/fakes/in-memory-document-repo";
import { InMemoryFileRepo } from "../../../testkit/fakes/in-memory-file-repo";
import { InMemoryDocumentLinkRepo } from "../../../testkit/fakes/in-memory-document-link-repo";
import { FakeObjectStoragePort } from "../../../testkit/fakes/fake-object-storage";
import { FakeOutboxPort } from "../../../testkit/fakes/fake-outbox";
import { FixedClock, NoopLogger, unwrap } from "@corely/kernel";

class TestIdGenerator {
  private counter = 0;
  newId() {
    this.counter += 1;
    return `id-${this.counter}`;
  }
}

describe("RequestInvoicePdfUseCase", () => {
  let documentRepo: InMemoryDocumentRepo;
  let fileRepo: InMemoryFileRepo;
  let linkRepo: InMemoryDocumentLinkRepo;
  let storage: FakeObjectStoragePort;
  let outbox: FakeOutboxPort;
  let idGen: TestIdGenerator;
  let clock: FixedClock;
  let useCase: RequestInvoicePdfUseCase;

  beforeEach(() => {
    documentRepo = new InMemoryDocumentRepo();
    fileRepo = new InMemoryFileRepo();
    linkRepo = new InMemoryDocumentLinkRepo(documentRepo);
    storage = new FakeObjectStoragePort();
    outbox = new FakeOutboxPort();
    idGen = new TestIdGenerator();
    clock = new FixedClock(new Date("2025-01-01T00:00:00.000Z"));
    useCase = new RequestInvoicePdfUseCase({
      logger: new NoopLogger(),
      documentRepo,
      fileRepo,
      linkRepo,
      objectStorage: storage,
      outbox,
      idGenerator: idGen as any,
      clock,
      downloadTtlSeconds: 600,
      keyPrefix: "env/test",
    });
  });

  it("creates invoice pdf document and enqueues render event", async () => {
    const result = unwrap(await useCase.execute({ invoiceId: "inv-1" }, { tenantId: "tenant-1" }));

    expect(result.status).toBe("PENDING");
    expect(outbox.events).toHaveLength(1);
    expect(outbox.events[0].payload.documentId).toBe(result.documentId);
  });

  it("returns READY with download url when document already generated", async () => {
    const first = unwrap(await useCase.execute({ invoiceId: "inv-2" }, { tenantId: "tenant-1" }));
    const document = await documentRepo.findById("tenant-1", first.documentId);
    const file = await fileRepo.findById("tenant-1", first.fileId!);
    if (!document || !file) throw new Error("Test setup failed");
    document.status = "READY";
    storage.objects.set(file.objectKey, {
      key: file.objectKey,
      contentType: "application/pdf",
      bytes: Buffer.from("pdf"),
    });

    const second = unwrap(await useCase.execute({ invoiceId: "inv-2" }, { tenantId: "tenant-1" }));

    expect(second.status).toBe("READY");
    expect(second.downloadUrl).toContain(file.objectKey);
  });

  it("forces regeneration when requested", async () => {
    const first = unwrap(await useCase.execute({ invoiceId: "inv-3" }, { tenantId: "tenant-1" }));
    const document = await documentRepo.findById("tenant-1", first.documentId);
    if (!document) throw new Error("missing doc");
    document.status = "READY";

    const second = unwrap(
      await useCase.execute({ invoiceId: "inv-3", forceRegenerate: true }, { tenantId: "tenant-1" })
    );

    expect(second.status).toBe("PENDING");
    expect(outbox.events.length).toBeGreaterThan(1);
  });
});
