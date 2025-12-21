import { CompleteUploadUseCase } from "./use-cases/complete-upload/CompleteUploadUseCase";
import { CreateUploadIntentUseCase } from "./use-cases/create-upload-intent/CreateUploadIntentUseCase";
import { GetDownloadUrlUseCase } from "./use-cases/get-download-url/GetDownloadUrlUseCase";
import { LinkDocumentUseCase } from "./use-cases/link-document/LinkDocumentUseCase";
import { RequestInvoicePdfUseCase } from "./use-cases/request-invoice-pdf/RequestInvoicePdfUseCase";
import { GenerateInvoicePdfWorker } from "./use-cases/generate-invoice-pdf-worker/GenerateInvoicePdfWorker";

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
