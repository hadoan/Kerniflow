import { LoggerPort } from "@kerniflow/kernel";
import { DocumentRepoPort } from "../../ports/document-repo.port";
import { FileRepoPort } from "../../ports/file-repo.port";
import { ObjectStoragePort } from "../../ports/object-storage.port";
import { PdfRendererPort } from "../../ports/pdf-renderer.port";
import { InvoicePdfModelPort } from "../../../../invoices/application/ports/invoice-pdf-model.port";

type EventPayload = {
  tenantId: string;
  invoiceId: string;
  documentId: string;
  fileId: string;
};

type Deps = {
  logger: LoggerPort;
  documentRepo: DocumentRepoPort;
  fileRepo: FileRepoPort;
  objectStorage: ObjectStoragePort;
  pdfRenderer: PdfRendererPort;
  invoicePdfModel: InvoicePdfModelPort;
};

export class GenerateInvoicePdfWorker {
  constructor(private readonly deps: Deps) {}

  async handle(event: EventPayload) {
    const { tenantId, invoiceId, documentId, fileId } = event;
    const document = await this.deps.documentRepo.findById(tenantId, documentId);
    const file = await this.deps.fileRepo.findById(tenantId, fileId);

    if (!document || !file || file.documentId !== document.id) {
      this.deps.logger.error("generate_invoice_pdf.missing_document_or_file", {
        documentId,
        fileId,
        tenantId,
      });
      return;
    }

    try {
      const model = await this.deps.invoicePdfModel.getInvoicePdfModel(tenantId, invoiceId);
      if (!model) {
        throw new Error("Invoice model not found");
      }

      const pdfBytes = await this.deps.pdfRenderer.renderInvoicePdf({
        tenantId,
        invoiceId,
        model,
      });

      const upload = await this.deps.objectStorage.putObject({
        tenantId,
        objectKey: file.objectKey,
        contentType: "application/pdf",
        bytes: pdfBytes,
      });

      file.markUploaded({
        sizeBytes: upload.sizeBytes,
        contentType: "application/pdf",
      });
      document.markReady(new Date());

      await this.deps.fileRepo.save(file);
      await this.deps.documentRepo.save(document);
    } catch (error) {
      this.deps.logger.error("generate_invoice_pdf.failed", {
        tenantId,
        invoiceId,
        documentId,
        error,
      });
      document.markFailed((error as Error).message, new Date());
      await this.deps.documentRepo.save(document);
    }
  }
}
