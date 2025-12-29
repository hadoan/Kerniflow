import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent } from "@/shared/ui/card";
import { salesApi } from "@/lib/sales-api";
import { customersApi } from "@/lib/customers-api";
import { QuoteForm, type QuoteFormValues } from "../components/QuoteForm";
import { salesQueryKeys } from "../queries/sales.queryKeys";
import { toast } from "sonner";

export default function QuoteDetailPage() {
  const { quoteId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: quoteData } = useQuery({
    queryKey: salesQueryKeys.quotes.detail(quoteId ?? ""),
    queryFn: () => salesApi.getQuote(quoteId ?? ""),
    enabled: Boolean(quoteId),
  });

  const { data: customersData } = useQuery({
    queryKey: ["customers"],
    queryFn: () => customersApi.listCustomers(),
  });

  const quote = quoteData?.quote;
  const isDraft = quote?.status === "DRAFT";

  const updateMutation = useMutation({
    mutationFn: (values: QuoteFormValues) =>
      salesApi.updateQuote(quoteId ?? "", {
        quoteId: quoteId ?? "",
        headerPatch: {
          customerPartyId: values.customerPartyId,
          currency: values.currency,
          paymentTerms: values.paymentTerms,
          issueDate: values.issueDate,
          validUntilDate: values.validUntilDate,
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
      void queryClient.invalidateQueries({ queryKey: salesQueryKeys.quotes.detail(quoteId ?? "") });
      toast.success("Quote updated");
    },
    onError: () => toast.error("Failed to update quote"),
  });

  const sendMutation = useMutation({
    mutationFn: () => salesApi.sendQuote(quoteId ?? ""),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: salesQueryKeys.quotes.detail(quoteId ?? "") });
      toast.success("Quote sent");
    },
    onError: () => toast.error("Failed to send quote"),
  });

  const acceptMutation = useMutation({
    mutationFn: () => salesApi.acceptQuote(quoteId ?? ""),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: salesQueryKeys.quotes.detail(quoteId ?? "") });
      toast.success("Quote accepted");
    },
    onError: () => toast.error("Failed to accept quote"),
  });

  const rejectMutation = useMutation({
    mutationFn: () => salesApi.rejectQuote(quoteId ?? ""),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: salesQueryKeys.quotes.detail(quoteId ?? "") });
      toast.success("Quote rejected");
    },
    onError: () => toast.error("Failed to reject quote"),
  });

  const convertToOrderMutation = useMutation({
    mutationFn: () => salesApi.convertQuoteToOrder(quoteId ?? ""),
    onSuccess: (data) => {
      toast.success("Sales order created");
      navigate(`/sales/orders/${data.order.id}`);
    },
    onError: () => toast.error("Failed to convert quote"),
  });

  const convertToInvoiceMutation = useMutation({
    mutationFn: () => salesApi.convertQuoteToInvoice(quoteId ?? ""),
    onSuccess: (data) => {
      toast.success("Invoice created");
      navigate(`/sales/invoices/${data.invoice.id}`);
    },
    onError: () => toast.error("Failed to convert quote"),
  });

  if (!quote) {
    return (
      <div className="p-6 lg:p-8">
        <p className="text-muted-foreground">Loading quote...</p>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-h1 text-foreground">Quote {quote.number ?? "Draft"}</h1>
            <Badge variant={isDraft ? "muted" : "accent"}>{quote.status}</Badge>
          </div>
          <p className="text-muted-foreground">Manage quote details and next steps.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => navigate("/sales/copilot")}>
            <Sparkles className="h-4 w-4" />
            AI Assist
          </Button>
          {isDraft && (
            <Button variant="accent" onClick={() => sendMutation.mutate()}>
              Send Quote
            </Button>
          )}
          {quote.status === "SENT" && (
            <>
              <Button variant="secondary" onClick={() => acceptMutation.mutate()}>
                Accept
              </Button>
              <Button variant="ghost" onClick={() => rejectMutation.mutate()}>
                Reject
              </Button>
            </>
          )}
          {quote.status === "ACCEPTED" && (
            <>
              <Button variant="secondary" onClick={() => convertToOrderMutation.mutate()}>
                Convert to Order
              </Button>
              <Button variant="accent" onClick={() => convertToInvoiceMutation.mutate()}>
                Convert to Invoice
              </Button>
            </>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <QuoteForm
            customers={customersData?.customers ?? []}
            initial={quote}
            disabled={!isDraft}
            onSubmit={(values) => updateMutation.mutate(values)}
          />
        </CardContent>
      </Card>
    </div>
  );
}
