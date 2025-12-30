import { Inject, Injectable, Logger } from "@nestjs/common";
import type { UseCaseContext } from "@corely/kernel";
import type { InvoiceRepoPort } from "../../ports/invoice-repository.port";
import type { InvoicePdfModelPort } from "../../ports/invoice-pdf-model.port";
import type { InvoicePdfRendererPort } from "../../ports/invoice-pdf-renderer.port";
import type { ObjectStoragePort } from "../../../../documents/application/ports/object-storage.port";
import { INVOICE_PDF_MODEL_PORT } from "../../ports/invoice-pdf-model.port";
import { INVOICE_PDF_RENDERER_PORT } from "../../ports/invoice-pdf-renderer.port";
import * as fs from "fs/promises";
import * as path from "path";

export type DownloadInvoicePdfInput = {
  invoiceId: string;
};

export type DownloadInvoicePdfOutput = {
  downloadUrl: string;
  expiresAt: Date;
};

@Injectable()
export class DownloadInvoicePdfUseCase {
  private readonly logger = new Logger(DownloadInvoicePdfUseCase.name);

  constructor(
    private readonly invoiceRepo: InvoiceRepoPort,
    @Inject(INVOICE_PDF_MODEL_PORT) private readonly pdfModelPort: InvoicePdfModelPort,
    @Inject(INVOICE_PDF_RENDERER_PORT) private readonly rendererPort: InvoicePdfRendererPort,
    private readonly storagePort: ObjectStoragePort
  ) {}

  async execute(
    input: DownloadInvoicePdfInput,
    ctx: UseCaseContext
  ): Promise<DownloadInvoicePdfOutput> {
    const { invoiceId } = input;
    const { tenantId } = ctx;

    if (!tenantId) {
      throw new Error("tenantId is required in context");
    }

    // 1. Authorize: Fetch invoice
    const invoice = await this.invoiceRepo.findById(tenantId, invoiceId);
    if (!invoice) {
      throw new Error(`Invoice not found: ${invoiceId}`);
    }

    // // 2. Validate status: only finalized invoices can have PDFs
    // if (invoice.status === "DRAFT") {
    //   throw new Error("Cannot download PDF for draft invoice");
    // }

    // 3. Check if valid PDF exists
    const now = new Date();
    const currentSourceVersion = invoice.updatedAt.toISOString();

    if (invoice.isPdfReady()) {
      this.logger.log(`PDF already exists for invoice ${invoiceId}, returning signed URL`);
      return this.createSignedDownloadUrl(tenantId, invoice.pdfStorageKey!);
    }

    // 4. Generate and store PDF
    this.logger.log(
      `Generating PDF for invoice ${invoiceId} (sourceVersion: ${currentSourceVersion})`
    );

    // 4a. Mark generating
    invoice.markPdfGenerating(currentSourceVersion, now);
    await this.invoiceRepo.save(tenantId, invoice);

    try {
      // 4b. Fetch PDF model
      const model = await this.pdfModelPort.getInvoicePdfModel(tenantId, invoiceId);
      if (!model) {
        throw new Error("Invoice data incomplete for PDF generation");
      }

      // 4c. Render PDF
      const pdfBytes = await this.rendererPort.renderInvoiceToPdf({
        tenantId,
        invoiceId,
        model,
      });

      // 4d. Save to local folder first
      const storageKey = this.buildStorageKey(
        tenantId,
        invoiceId,
        invoice.number!,
        currentSourceVersion
      );
      await this.savePdfToLocalFolder(tenantId, invoiceId, invoice.number!, pdfBytes);

      // 4e. Upload to GCS
      await this.storagePort.putObject({
        tenantId,
        objectKey: storageKey,
        contentType: "application/pdf",
        bytes: pdfBytes,
      });

      // 4e. Mark PDF ready
      invoice.markPdfGenerated({
        storageKey,
        generatedAt: new Date(),
        sourceVersion: currentSourceVersion,
        now: new Date(),
      });
      await this.invoiceRepo.save(tenantId, invoice);

      this.logger.log(`PDF generated successfully for invoice ${invoiceId}`);

      // 5. Return signed download URL
      return this.createSignedDownloadUrl(tenantId, storageKey);
    } catch (error) {
      this.logger.error(`PDF generation failed for invoice ${invoiceId}`, error);
      invoice.markPdfFailed(error.message, new Date());
      await this.invoiceRepo.save(tenantId, invoice);
      throw error;
    }
  }

  private async savePdfToLocalFolder(
    tenantId: string,
    invoiceId: string,
    invoiceNumber: string,
    pdfBytes: Uint8Array
  ): Promise<void> {
    try {
      // Create pdfs directory in the current working directory
      const pdfsDir = path.join(process.cwd(), "pdfs");
      await fs.mkdir(pdfsDir, { recursive: true });

      // Sanitize invoice number for filename
      const sanitizedNumber = invoiceNumber.replace(/[^a-zA-Z0-9-_]/g, "-");
      const filename = `invoice-${sanitizedNumber}-${invoiceId}.pdf`;
      const filePath = path.join(pdfsDir, filename);

      // Write the PDF to the local file
      await fs.writeFile(filePath, pdfBytes);

      this.logger.log(
        `PDF saved locally for tenant ${tenantId}, invoice ${invoiceId}: ${filePath}`
      );
    } catch (error) {
      this.logger.error(
        `Failed to save PDF locally for tenant ${tenantId}, invoice ${invoiceId}`,
        error
      );
      // Don't throw - we still want to upload to GCS even if local save fails
    }
  }

  private buildStorageKey(
    tenantId: string,
    invoiceId: string,
    invoiceNumber: string,
    sourceVersion: string
  ): string {
    // Sanitize invoice number for filename
    const sanitizedNumber = invoiceNumber.replace(/[^a-zA-Z0-9-_]/g, "-");
    return `tenants/${tenantId}/invoices/${invoiceId}/invoice-${sanitizedNumber}-${sourceVersion}.pdf`;
  }

  private async createSignedDownloadUrl(
    tenantId: string,
    storageKey: string
  ): Promise<DownloadInvoicePdfOutput> {
    const signedDownload = await this.storagePort.createSignedDownloadUrl({
      tenantId,
      objectKey: storageKey,
      expiresInSeconds: 900, // 15 minutes
    });

    return {
      downloadUrl: signedDownload.url,
      expiresAt: signedDownload.expiresAt,
    };
  }
}
