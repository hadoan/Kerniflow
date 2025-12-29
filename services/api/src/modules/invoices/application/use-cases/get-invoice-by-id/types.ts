import { type GetInvoiceByIdInput, type InvoiceDto } from "@kerniflow/contracts";

export type GetInvoiceByIdCommand = GetInvoiceByIdInput;
export type GetInvoiceByIdResult = { invoice: InvoiceDto };
