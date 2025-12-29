import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/shared/ui/card";
import { salesApi } from "@/lib/sales-api";
import { customersApi } from "@/lib/customers-api";
import { QuoteForm, type QuoteFormValues } from "../components/QuoteForm";
import { toast } from "sonner";

export default function NewQuotePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const prefill = (location.state as { prefill?: Partial<QuoteFormValues> } | null)?.prefill;
  const { data: customersData } = useQuery({
    queryKey: ["customers"],
    queryFn: () => customersApi.listCustomers(),
  });

  const createMutation = useMutation({
    mutationFn: (values: QuoteFormValues) =>
      salesApi.createQuote({
        customerPartyId: values.customerPartyId,
        currency: values.currency,
        paymentTerms: values.paymentTerms,
        issueDate: values.issueDate,
        validUntilDate: values.validUntilDate,
        notes: values.notes,
        lineItems: values.lineItems.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          unitPriceCents: item.unitPriceCents,
          discountCents: item.discountCents,
        })),
      }),
    onSuccess: (data) => {
      toast.success("Quote created");
      navigate(`/sales/quotes/${data.quote.id}`);
    },
    onError: () => toast.error("Failed to create quote"),
  });

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <h1 className="text-h1 text-foreground">New Quote</h1>
      <Card>
        <CardContent className="p-6">
          <QuoteForm
            customers={customersData?.customers ?? []}
            initial={prefill}
            onSubmit={(values) => createMutation.mutate(values)}
          />
        </CardContent>
      </Card>
    </div>
  );
}
