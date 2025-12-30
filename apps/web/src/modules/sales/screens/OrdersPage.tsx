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
import type { SalesOrderDto } from "@corely/contracts";

const getStatusVariant = (status: SalesOrderDto["status"]) => {
  switch (status) {
    case "DRAFT":
      return "muted" as const;
    case "CONFIRMED":
      return "accent" as const;
    case "FULFILLED":
      return "success" as const;
    case "CANCELED":
      return "danger" as const;
    default:
      return "secondary" as const;
  }
};

export default function OrdersPage() {
  const navigate = useNavigate();

  const { data: ordersData } = useQuery({
    queryKey: salesQueryKeys.orders.list(),
    queryFn: () => salesApi.listOrders(),
  });

  const { data: customersData } = useQuery({
    queryKey: ["customers"],
    queryFn: () => customersApi.listCustomers(),
  });

  const orders = ordersData?.items ?? [];
  const customers = customersData?.customers ?? [];
  const getCustomerName = (partyId: string) =>
    customers.find((customer) => customer.id === partyId)?.displayName ?? "Unknown";

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-h1 text-foreground">Orders</h1>
          <p className="text-muted-foreground">Track order confirmations and fulfillment.</p>
        </div>
        <Button variant="accent" onClick={() => navigate("/sales/orders/new")}>
          <Plus className="h-4 w-4" />
          New Order
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {orders.length === 0 ? (
            <EmptyState
              title="No orders yet"
              description="Convert a quote or create a new order."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                      Order #
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
                  {orders.map((order) => (
                    <tr
                      key={order.id}
                      className="border-b border-border last:border-0 hover:bg-muted/30"
                    >
                      <td className="px-4 py-3 text-sm font-medium">{order.number ?? "Draft"}</td>
                      <td className="px-4 py-3 text-sm">
                        {getCustomerName(order.customerPartyId)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={getStatusVariant(order.status)}>{order.status}</Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-medium">
                        {formatMoney(order.totals.totalCents, "en-US", order.currency)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/sales/orders/${order.id}`)}
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
