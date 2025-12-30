import { describe, expect, it } from "vitest";
import { GenerateInvoicePdfWorker } from "./generate-invoice-pdf.worker";
import { InMemoryDocumentRepo } from "../../../testkit/fakes/in-memory-document-repo";
import { InMemoryFileRepo } from "../../../testkit/fakes/in-memory-file-repo";
import { FakeObjectStoragePort } from "../../../testkit/fakes/fake-object-storage";
import { FakePdfRenderer } from "../../../testkit/fakes/fake-pdf-renderer";
import { FakeInvoicePdfModelPort } from "../../../testkit/fakes/fake-invoice-pdf-model";
import { NoopLogger } from "@corely/kernel";
import { DocumentAggregate } from "../../../domain/document.aggregate";

describe("GenerateInvoicePdfWorker", () => {
  it("uploads rendered pdf and marks document ready", async () => {
    const documentRepo = new InMemoryDocumentRepo();
    const fileRepo = new InMemoryFileRepo();
    const storage = new FakeObjectStoragePort();
    const pdfRenderer = new FakePdfRenderer();
    const invoiceModel = new FakeInvoicePdfModelPort();
    const now = new Date("2025-01-01T00:00:00.000Z");

    const document = DocumentAggregate.create({
      id: "doc-1",
      tenantId: "tenant-1",
      type: "INVOICE_PDF",
      createdAt: now,
      file: {
        id: "file-1",
        kind: "GENERATED",
        storageProvider: storage.provider(),
        bucket: storage.bucket(),
        objectKey: "env/test/documents/doc-1/files/file-1/invoice.pdf",
        contentType: "application/pdf",
        createdAt: now,
      },
    });
    await documentRepo.create(document);
    await fileRepo.create(document.files[0]);

    const worker = new GenerateInvoicePdfWorker({
      logger: new NoopLogger(),
      documentRepo,
      fileRepo,
      objectStorage: storage,
      pdfRenderer,
      invoicePdfModel: invoiceModel,
    });

    await worker.handle({
      tenantId: "tenant-1",
      invoiceId: "inv-1",
      documentId: document.id,
      fileId: document.files[0].id,
    });

    const savedDoc = await documentRepo.findById("tenant-1", document.id);
    const savedFile = await fileRepo.findById("tenant-1", document.files[0].id);
    expect(savedDoc?.status).toBe("READY");
    expect(savedFile?.contentType).toBe("application/pdf");
    expect(savedFile?.sizeBytes).toBeDefined();
    expect(storage.objects.has(document.files[0].objectKey)).toBe(true);
  });
});
