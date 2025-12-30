import type {
  ListQuotesInput,
  ListSalesOrdersInput,
  ListSalesInvoicesInput,
} from "@corely/contracts";

export const salesQueryKeys = {
  all: ["sales"] as const,
  quotes: {
    all: () => [...salesQueryKeys.all, "quotes"] as const,
    lists: () => [...salesQueryKeys.quotes.all(), "list"] as const,
    list: (query?: ListQuotesInput) => [...salesQueryKeys.quotes.lists(), query] as const,
    details: () => [...salesQueryKeys.quotes.all(), "detail"] as const,
    detail: (quoteId: string) => [...salesQueryKeys.quotes.details(), quoteId] as const,
  },
  orders: {
    all: () => [...salesQueryKeys.all, "orders"] as const,
    lists: () => [...salesQueryKeys.orders.all(), "list"] as const,
    list: (query?: ListSalesOrdersInput) => [...salesQueryKeys.orders.lists(), query] as const,
    details: () => [...salesQueryKeys.orders.all(), "detail"] as const,
    detail: (orderId: string) => [...salesQueryKeys.orders.details(), orderId] as const,
  },
  invoices: {
    all: () => [...salesQueryKeys.all, "invoices"] as const,
    lists: () => [...salesQueryKeys.invoices.all(), "list"] as const,
    list: (query?: ListSalesInvoicesInput) => [...salesQueryKeys.invoices.lists(), query] as const,
    details: () => [...salesQueryKeys.invoices.all(), "detail"] as const,
    detail: (invoiceId: string) => [...salesQueryKeys.invoices.details(), invoiceId] as const,
  },
  settings: () => [...salesQueryKeys.all, "settings"] as const,
  payments: {
    all: () => [...salesQueryKeys.all, "payments"] as const,
    list: (invoiceId: string) => [...salesQueryKeys.payments.all(), "list", invoiceId] as const,
  },
};
