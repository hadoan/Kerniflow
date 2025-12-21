import type { InvoiceEmailProps } from "./invoice-email.types.js";

export function buildInvoiceEmailSubject(props: InvoiceEmailProps): string {
  return `Invoice ${props.invoiceNumber} from ${props.companyName}`;
}
