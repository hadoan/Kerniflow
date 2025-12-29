import { type InvoicePdfModelPort } from "../../../invoices/application/ports/invoice-pdf-model.port";

export class NullInvoicePdfModelAdapter implements InvoicePdfModelPort {
  async getInvoicePdfModel(): Promise<null> {
    return null;
  }
}
