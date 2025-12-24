import type { CancelInvoiceUseCase } from "./use-cases/cancel-invoice/cancel-invoice.usecase";
import type { CreateInvoiceUseCase } from "./use-cases/create-invoice/create-invoice.usecase";
import type { FinalizeInvoiceUseCase } from "./use-cases/finalize-invoice/finalize-invoice.usecase";
import type { GetInvoiceByIdUseCase } from "./use-cases/get-invoice-by-id/get-invoice-by-id.usecase";
import type { ListInvoicesUseCase } from "./use-cases/list-invoices/list-invoices.usecase";
import type { RecordPaymentUseCase } from "./use-cases/record-payment/record-payment.usecase";
import type { SendInvoiceUseCase } from "./use-cases/send-invoice/send-invoice.usecase";
import type { UpdateInvoiceUseCase } from "./use-cases/update-invoice/update-invoice.usecase";

export class InvoicesApplication {
  constructor(
    public readonly createInvoice: CreateInvoiceUseCase,
    public readonly updateInvoice: UpdateInvoiceUseCase,
    public readonly finalizeInvoice: FinalizeInvoiceUseCase,
    public readonly sendInvoice: SendInvoiceUseCase,
    public readonly recordPayment: RecordPaymentUseCase,
    public readonly cancelInvoice: CancelInvoiceUseCase,
    public readonly getInvoiceById: GetInvoiceByIdUseCase,
    public readonly listInvoices: ListInvoicesUseCase
  ) {}
}
