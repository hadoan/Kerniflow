import React from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/shared/ui/card";
import { salesApi } from "@/lib/sales-api";
import { customersApi } from "@/lib/customers-api";
import { OrderForm, type OrderFormValues } from "../components/OrderForm";
import { toast } from "sonner";

export default function NewOrderPage() {
  const navigate = useNavigate();
  const { data: customersData } = useQuery({
    queryKey: ["customers"],
    queryFn: () => customersApi.listCustomers(),
  });

  const createMutation = useMutation({
    mutationFn: (values: OrderFormValues) =>
      salesApi.createOrder({
        customerPartyId: values.customerPartyId,
        currency: values.currency,
        orderDate: values.orderDate,
        deliveryDate: values.deliveryDate,
        notes: values.notes,
        lineItems: values.lineItems.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          unitPriceCents: item.unitPriceCents,
          discountCents: item.discountCents,
        })),
      }),
    onSuccess: (data) => {
      toast.success("Order created");
      navigate(`/sales/orders/${data.order.id}`);
    },
    onError: () => toast.error("Failed to create order"),
  });

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <h1 className="text-h1 text-foreground">New Order</h1>
      <Card>
        <CardContent className="p-6">
          <OrderForm
            customers={customersData?.customers ?? []}
            onSubmit={(values) => createMutation.mutate(values)}
          />
        </CardContent>
      </Card>
    </div>
  );
}
