import { Injectable } from "@nestjs/common";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { PdfRendererPort } from "../../../application/ports/pdf-renderer.port";

@Injectable()
export class PdfLibRendererAdapter implements PdfRendererPort {
  async renderInvoicePdf(
    args: Parameters<PdfRendererPort["renderInvoicePdf"]>[0]
  ): Promise<Buffer> {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage();
    const { width, height } = page.getSize();
    const margin = 36;
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    let cursorY = height - margin;

    const drawLine = (text: string, size = 12) => {
      page.drawText(text, { x: margin, y: cursorY, size, font });
      cursorY -= size + 6;
    };

    drawLine(`Invoice #${args.model.invoiceNumber}`, 18);
    drawLine(`Bill To: ${args.model.billToName}`);
    if (args.model.billToAddress) {
      drawLine(args.model.billToAddress);
    }
    drawLine(`Issue Date: ${args.model.issueDate}`);
    if (args.model.dueDate) {
      drawLine(`Due Date: ${args.model.dueDate}`);
    }
    cursorY -= 6;
    drawLine("Items:", 14);
    args.model.items.forEach((item) => {
      drawLine(`${item.description} — Qty: ${item.qty} x ${item.unitPrice} (${item.lineTotal})`);
    });
    cursorY -= 6;
    drawLine(`Subtotal: ${args.model.totals.subtotal}`);
    drawLine(`Total: ${args.model.totals.total}`, 14);
    if (args.model.notes) {
      cursorY -= 6;
      drawLine("Notes:");
      drawLine(args.model.notes);
    }

    const bytes = await pdfDoc.save();
    return Buffer.from(bytes);
  }
}
