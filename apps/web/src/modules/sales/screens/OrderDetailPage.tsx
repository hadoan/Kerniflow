import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent } from "@/shared/ui/card";
import { salesApi } from "@/lib/sales-api";
import { customersApi } from "@/lib/customers-api";
import { OrderForm, type OrderFormValues } from "../components/OrderForm";
import { salesQueryKeys } from "../queries/sales.queryKeys";
import { toast } from "sonner";

export default function OrderDetailPage() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: orderData } = useQuery({
    queryKey: salesQueryKeys.orders.detail(orderId ?? ""),
    queryFn: () => salesApi.getOrder(orderId ?? ""),
    enabled: Boolean(orderId),
  });

  const { data: customersData } = useQuery({
    queryKey: ["customers"],
    queryFn: () => customersApi.listCustomers(),
  });

  const order = orderData?.order;
  const isDraft = order?.status === "DRAFT";

  const updateMutation = useMutation({
    mutationFn: (values: OrderFormValues) =>
      salesApi.updateOrder(orderId ?? "", {
        orderId: orderId ?? "",
        headerPatch: {
          customerPartyId: values.customerPartyId,
          currency: values.currency,
          orderDate: values.orderDate,
          deliveryDate: values.deliveryDate,
          notes: values.notes,
        },
        lineItems: values.lineItems.map((item) => ({
          id: item.id,
          description: item.description,
          quantity: item.quantity,
          unitPriceCents: item.unitPriceCents,
          discountCents: item.discountCents,
        })),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: salesQueryKeys.orders.detail(orderId ?? "") });
      toast.success("Order updated");
    },
    onError: () => toast.error("Failed to update order"),
  });

  const confirmMutation = useMutation({
    mutationFn: () => salesApi.confirmOrder(orderId ?? ""),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: salesQueryKeys.orders.detail(orderId ?? "") });
      toast.success("Order confirmed");
    },
    onError: () => toast.error("Failed to confirm order"),
  });

  const fulfillMutation = useMutation({
    mutationFn: () => salesApi.fulfillOrder(orderId ?? ""),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: salesQueryKeys.orders.detail(orderId ?? "") });
      toast.success("Order fulfilled");
    },
    onError: () => toast.error("Failed to fulfill order"),
  });

  const createInvoiceMutation = useMutation({
    mutationFn: () => salesApi.createInvoiceFromOrder(orderId ?? ""),
    onSuccess: (data) => {
      toast.success("Invoice created");
      navigate(`/sales/invoices/${data.invoice.id}`);
    },
    onError: () => toast.error("Failed to create invoice"),
  });

  if (!order) {
    return (
      <div className="p-6 lg:p-8">
        <p className="text-muted-foreground">Loading order...</p>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-h1 text-foreground">Order {order.number ?? "Draft"}</h1>
            <Badge variant={isDraft ? "muted" : "accent"}>{order.status}</Badge>
          </div>
          <p className="text-muted-foreground">Manage order confirmation and fulfillment.</p>
        </div>
        <div className="flex gap-2">
          {order.status === "DRAFT" && (
            <Button variant="accent" onClick={() => confirmMutation.mutate()}>
              Confirm Order
            </Button>
          )}
          {order.status === "CONFIRMED" && (
            <Button variant="secondary" onClick={() => fulfillMutation.mutate()}>
              Mark Fulfilled
            </Button>
          )}
          {order.status !== "INVOICED" && order.status !== "CANCELED" && (
            <Button variant="secondary" onClick={() => createInvoiceMutation.mutate()}>
              Create Invoice
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <OrderForm
            customers={customersData?.customers ?? []}
            initial={order}
            disabled={!isDraft}
            onSubmit={(values) => updateMutation.mutate(values)}
          />
        </CardContent>
      </Card>
    </div>
  );
}
