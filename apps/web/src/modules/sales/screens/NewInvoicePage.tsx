import React from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/shared/ui/card";
import { salesApi } from "@/lib/sales-api";
import { customersApi } from "@/lib/customers-api";
import { InvoiceForm, type InvoiceFormValues } from "../components/InvoiceForm";
import { toast } from "sonner";

export default function NewInvoicePage() {
  const navigate = useNavigate();
  const { data: customersData } = useQuery({
    queryKey: ["customers"],
    queryFn: () => customersApi.listCustomers(),
  });

  const createMutation = useMutation({
    mutationFn: (values: InvoiceFormValues) =>
      salesApi.createInvoice({
        customerPartyId: values.customerPartyId,
        currency: values.currency,
        issueDate: values.issueDate,
        dueDate: values.dueDate,
        paymentTerms: values.paymentTerms,
        notes: values.notes,
        lineItems: values.lineItems.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          unitPriceCents: item.unitPriceCents,
          discountCents: item.discountCents,
        })),
      }),
    onSuccess: (data) => {
      toast.success("Invoice created");
      navigate(`/sales/invoices/${data.invoice.id}`);
    },
    onError: () => toast.error("Failed to create invoice"),
  });

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <h1 className="text-h1 text-foreground">New Invoice</h1>
      <Card>
        <CardContent className="p-6">
          <InvoiceForm
            customers={customersData?.customers ?? []}
            onSubmit={(values) => createMutation.mutate(values)}
          />
        </CardContent>
      </Card>
    </div>
  );
}
