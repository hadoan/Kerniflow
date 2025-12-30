import { type GetInvoiceByIdInput, type InvoiceDto } from "@corely/contracts";

export type GetInvoiceByIdCommand = GetInvoiceByIdInput;
export type GetInvoiceByIdResult = { invoice: InvoiceDto };
