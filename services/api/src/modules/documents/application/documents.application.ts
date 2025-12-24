import type { CompleteUploadUseCase } from "./use-cases/complete-upload/complete-upload.usecase";
import type { CreateUploadIntentUseCase } from "./use-cases/create-upload-intent/create-upload-intent.usecase";
import type { GenerateInvoicePdfWorker } from "./use-cases/generate-invoice-pdf-worker/generate-invoice-pdf.worker";
import type { GetDownloadUrlUseCase } from "./use-cases/get-download-url/get-download-url.usecase";
import type { LinkDocumentUseCase } from "./use-cases/link-document/link-document.usecase";
import type { RequestInvoicePdfUseCase } from "./use-cases/request-invoice-pdf/request-invoice-pdf.usecase";

export class DocumentsApplication {
  constructor(
    public readonly createUploadIntent: CreateUploadIntentUseCase,
    public readonly completeUpload: CompleteUploadUseCase,
    public readonly getDownloadUrl: GetDownloadUrlUseCase,
    public readonly linkDocument: LinkDocumentUseCase,
    public readonly requestInvoicePdf: RequestInvoicePdfUseCase,
    public readonly generateInvoicePdfWorker: GenerateInvoicePdfWorker
  ) {}
}
