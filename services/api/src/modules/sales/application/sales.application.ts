import {
  type CreateQuoteUseCase,
  type UpdateQuoteUseCase,
  type SendQuoteUseCase,
  type AcceptQuoteUseCase,
  type RejectQuoteUseCase,
  type ConvertQuoteToOrderUseCase,
  type ConvertQuoteToInvoiceUseCase,
  type GetQuoteUseCase,
  type ListQuotesUseCase,
} from "./use-cases/quotes.usecases";
import {
  type CreateSalesOrderUseCase,
  type UpdateSalesOrderUseCase,
  type ConfirmSalesOrderUseCase,
  type FulfillSalesOrderUseCase,
  type CancelSalesOrderUseCase,
  type CreateInvoiceFromOrderUseCase,
  type GetSalesOrderUseCase,
  type ListSalesOrdersUseCase,
} from "./use-cases/orders.usecases";
import {
  type CreateSalesInvoiceUseCase,
  type UpdateSalesInvoiceUseCase,
  type IssueSalesInvoiceUseCase,
  type VoidSalesInvoiceUseCase,
  type GetSalesInvoiceUseCase,
  type ListSalesInvoicesUseCase,
} from "./use-cases/invoices.usecases";
import {
  type RecordPaymentUseCase,
  type ListPaymentsUseCase,
  type ReversePaymentUseCase,
} from "./use-cases/payments.usecases";
import {
  type GetSalesSettingsUseCase,
  type UpdateSalesSettingsUseCase,
} from "./use-cases/settings.usecases";

export class SalesApplication {
  constructor(
    public readonly createQuote: CreateQuoteUseCase,
    public readonly updateQuote: UpdateQuoteUseCase,
    public readonly sendQuote: SendQuoteUseCase,
    public readonly acceptQuote: AcceptQuoteUseCase,
    public readonly rejectQuote: RejectQuoteUseCase,
    public readonly convertQuoteToOrder: ConvertQuoteToOrderUseCase,
    public readonly convertQuoteToInvoice: ConvertQuoteToInvoiceUseCase,
    public readonly getQuote: GetQuoteUseCase,
    public readonly listQuotes: ListQuotesUseCase,

    public readonly createOrder: CreateSalesOrderUseCase,
    public readonly updateOrder: UpdateSalesOrderUseCase,
    public readonly confirmOrder: ConfirmSalesOrderUseCase,
    public readonly fulfillOrder: FulfillSalesOrderUseCase,
    public readonly cancelOrder: CancelSalesOrderUseCase,
    public readonly createInvoiceFromOrder: CreateInvoiceFromOrderUseCase,
    public readonly getOrder: GetSalesOrderUseCase,
    public readonly listOrders: ListSalesOrdersUseCase,

    public readonly createInvoice: CreateSalesInvoiceUseCase,
    public readonly updateInvoice: UpdateSalesInvoiceUseCase,
    public readonly issueInvoice: IssueSalesInvoiceUseCase,
    public readonly voidInvoice: VoidSalesInvoiceUseCase,
    public readonly getInvoice: GetSalesInvoiceUseCase,
    public readonly listInvoices: ListSalesInvoicesUseCase,

    public readonly recordPayment: RecordPaymentUseCase,
    public readonly listPayments: ListPaymentsUseCase,
    public readonly reversePayment: ReversePaymentUseCase,

    public readonly getSettings: GetSalesSettingsUseCase,
    public readonly updateSettings: UpdateSalesSettingsUseCase
  ) {}
}
