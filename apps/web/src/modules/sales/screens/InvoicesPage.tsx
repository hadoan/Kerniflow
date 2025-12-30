import React from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { salesApi } from "@/lib/sales-api";
import { customersApi } from "@/lib/customers-api";
import { formatMoney } from "@/shared/lib/formatters";
import { EmptyState } from "@/shared/components/EmptyState";
import { salesQueryKeys } from "../queries/sales.queryKeys";
import type { SalesInvoiceDto } from "@corely/contracts";

const getStatusVariant = (status: SalesInvoiceDto["status"]) => {
  switch (status) {
    case "DRAFT":
      return "muted" as const;
    case "ISSUED":
      return "accent" as const;
    case "PARTIALLY_PAID":
      return "warning" as const;
    case "PAID":
      return "success" as const;
    case "VOID":
      return "danger" as const;
    default:
      return "muted" as const;
  }
};

export default function InvoicesPage() {
  const navigate = useNavigate();

  const { data: invoicesData } = useQuery({
    queryKey: salesQueryKeys.invoices.list(),
    queryFn: () => salesApi.listInvoices(),
  });

  const { data: customersData } = useQuery({
    queryKey: ["customers"],
    queryFn: () => customersApi.listCustomers(),
  });

  const invoices = invoicesData?.items ?? [];
  const customers = customersData?.customers ?? [];
  const getCustomerName = (partyId: string) =>
    customers.find((customer) => customer.id === partyId)?.displayName ?? "Unknown";

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-h1 text-foreground">Sales Invoices</h1>
          <p className="text-muted-foreground">Issue invoices and record payments.</p>
        </div>
        <Button variant="accent" onClick={() => navigate("/sales/invoices/new")}>
          <Plus className="h-4 w-4" />
          New Invoice
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {invoices.length === 0 ? (
            <EmptyState
              title="No invoices yet"
              description="Create or convert an invoice from orders or quotes."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                      Invoice #
                    </th>
                    <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                      Customer
                    </th>
                    <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                      Status
                    </th>
                    <th className="text-right text-sm font-medium text-muted-foreground px-4 py-3">
                      Total
                    </th>
                    <th className="text-right text-sm font-medium text-muted-foreground px-4 py-3">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((invoice) => (
                    <tr
                      key={invoice.id}
                      className="border-b border-border last:border-0 hover:bg-muted/30"
                    >
                      <td className="px-4 py-3 text-sm font-medium">{invoice.number ?? "Draft"}</td>
                      <td className="px-4 py-3 text-sm">
                        {getCustomerName(invoice.customerPartyId)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={getStatusVariant(invoice.status)}>{invoice.status}</Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-medium">
                        {formatMoney(invoice.totals.totalCents, "en-US", invoice.currency)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/sales/invoices/${invoice.id}`)}
                        >
                          View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
