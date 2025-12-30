import React from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Plus, Sparkles } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { salesApi } from "@/lib/sales-api";
import { customersApi } from "@/lib/customers-api";
import { formatMoney } from "@/shared/lib/formatters";
import { EmptyState } from "@/shared/components/EmptyState";
import { salesQueryKeys } from "../queries/sales.queryKeys";
import type { QuoteDto } from "@corely/contracts";

const getStatusVariant = (status: QuoteDto["status"]) => {
  switch (status) {
    case "DRAFT":
      return "muted" as const;
    case "SENT":
      return "accent" as const;
    case "ACCEPTED":
      return "success" as const;
    case "REJECTED":
      return "danger" as const;
    case "CONVERTED":
      return "secondary" as const;
    default:
      return "muted" as const;
  }
};

export default function QuotesPage() {
  const navigate = useNavigate();

  const { data: quotesData } = useQuery({
    queryKey: salesQueryKeys.quotes.list(),
    queryFn: () => salesApi.listQuotes(),
  });

  const { data: customersData } = useQuery({
    queryKey: ["customers"],
    queryFn: () => customersApi.listCustomers(),
  });

  const quotes = quotesData?.items ?? [];
  const customers = customersData?.customers ?? [];
  const getCustomerName = (partyId: string) =>
    customers.find((customer) => customer.id === partyId)?.displayName ?? "Unknown";

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-h1 text-foreground">Quotes</h1>
          <p className="text-muted-foreground">Draft, send, and convert sales quotes.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => navigate("/sales/copilot")}>
            <Sparkles className="h-4 w-4" />
            AI: Create Quote
          </Button>
          <Button variant="accent" onClick={() => navigate("/sales/quotes/new")}>
            <Plus className="h-4 w-4" />
            New Quote
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {quotes.length === 0 ? (
            <EmptyState
              title="No quotes yet"
              description="Create your first quote or use Copilot to draft one."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                      Quote #
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
                  {quotes.map((quote) => (
                    <tr
                      key={quote.id}
                      className="border-b border-border last:border-0 hover:bg-muted/30"
                    >
                      <td className="px-4 py-3 text-sm font-medium">{quote.number ?? "Draft"}</td>
                      <td className="px-4 py-3 text-sm">
                        {getCustomerName(quote.customerPartyId)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={getStatusVariant(quote.status)}>{quote.status}</Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-medium">
                        {formatMoney(quote.totals.totalCents, "en-US", quote.currency)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/sales/quotes/${quote.id}`)}
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
