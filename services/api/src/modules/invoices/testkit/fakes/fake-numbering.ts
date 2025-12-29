import { type InvoiceNumberingPort } from "../../application/ports/invoice-numbering.port";

export class FakeInvoiceNumbering implements InvoiceNumberingPort {
  private counter = 1;
  constructor(private readonly prefix = "INV") {}

  async nextInvoiceNumber(_tenantId: string): Promise<string> {
    const number = `${this.prefix}-${String(this.counter).padStart(6, "0")}`;
    this.counter += 1;
    return number;
  }
}
