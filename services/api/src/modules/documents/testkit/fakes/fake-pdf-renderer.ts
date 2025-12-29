import { type PdfRendererPort } from "../../application/ports/pdf-renderer.port";

export class FakePdfRenderer implements PdfRendererPort {
  async renderInvoicePdf(): Promise<Buffer> {
    return Buffer.from("PDF");
  }
}
