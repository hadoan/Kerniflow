import React, { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent } from "@/shared/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { salesApi } from "@/lib/sales-api";
import { customersApi } from "@/lib/customers-api";
import { InvoiceForm, type InvoiceFormValues } from "../components/InvoiceForm";
import { salesQueryKeys } from "../queries/sales.queryKeys";
import { formatMoney } from "@/shared/lib/formatters";
import { toast } from "sonner";

const getStatusVariant = (status: string) => {
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

export default function InvoiceDetailPage() {
  const { invoiceId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: invoiceData } = useQuery({
    queryKey: salesQueryKeys.invoices.detail(invoiceId ?? ""),
    queryFn: () => salesApi.getInvoice(invoiceId ?? ""),
    enabled: Boolean(invoiceId),
  });

  const { data: customersData } = useQuery({
    queryKey: ["customers"],
    queryFn: () => customersApi.listCustomers(),
  });

  const invoice = invoiceData?.invoice;
  const isDraft = invoice?.status === "DRAFT";

  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState("BANK_TRANSFER");

  const updateMutation = useMutation({
    mutationFn: (values: InvoiceFormValues) =>
      salesApi.updateInvoice(invoiceId ?? "", {
        invoiceId: invoiceId ?? "",
        headerPatch: {
          customerPartyId: values.customerPartyId,
          currency: values.currency,
          issueDate: values.issueDate,
          dueDate: values.dueDate,
          paymentTerms: values.paymentTerms,
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
      void queryClient.invalidateQueries({
        queryKey: salesQueryKeys.invoices.detail(invoiceId ?? ""),
      });
      toast.success("Invoice updated");
    },
    onError: () => toast.error("Failed to update invoice"),
  });

  const issueMutation = useMutation({
    mutationFn: () => salesApi.issueInvoice(invoiceId ?? ""),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: salesQueryKeys.invoices.detail(invoiceId ?? ""),
      });
      toast.success("Invoice issued");
    },
    onError: () => toast.error("Failed to issue invoice"),
  });

  const voidMutation = useMutation({
    mutationFn: () => salesApi.voidInvoice(invoiceId ?? ""),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: salesQueryKeys.invoices.detail(invoiceId ?? ""),
      });
      toast.success("Invoice voided");
    },
    onError: () => toast.error("Failed to void invoice"),
  });

  const recordPaymentMutation = useMutation({
    mutationFn: () =>
      salesApi.recordPayment({
        invoiceId: invoiceId ?? "",
        amountCents: paymentAmount,
        paidAt: paymentDate,
        note: paymentMethod as any,
      }),
    onSuccess: () => {
      setPaymentDialogOpen(false);
      void queryClient.invalidateQueries({
        queryKey: salesQueryKeys.invoices.detail(invoiceId ?? ""),
      });
      toast.success("Payment recorded");
    },
    onError: () => toast.error("Failed to record payment"),
  });

  const payments = useMemo(() => invoice?.payments ?? [], [invoice?.payments]);

  if (!invoice) {
    return (
      <div className="p-6 lg:p-8">
        <p className="text-muted-foreground">Loading invoice...</p>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-h1 text-foreground">Invoice {invoice.number ?? "Draft"}</h1>
            <Badge variant={getStatusVariant(invoice.status)}>{invoice.status}</Badge>
          </div>
          <p className="text-muted-foreground">Issue, record payment, and manage postings.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => navigate("/sales/copilot")}>
            <Sparkles className="h-4 w-4" />
            AI Assist
          </Button>
          {isDraft && (
            <Button variant="accent" onClick={() => issueMutation.mutate()}>
              Issue Invoice
            </Button>
          )}
          {invoice.status !== "VOID" && (
            <Button variant="ghost" onClick={() => voidMutation.mutate()}>
              Void
            </Button>
          )}
          {invoice.status === "ISSUED" || invoice.status === "PARTIALLY_PAID" ? (
            <Button
              variant="secondary"
              onClick={() => {
                setPaymentAmount(invoice.totals.dueCents);
                setPaymentDialogOpen(true);
              }}
            >
              Record Payment
            </Button>
          ) : null}
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <InvoiceForm
            customers={customersData?.customers ?? []}
            initial={invoice}
            disabled={!isDraft}
            onSubmit={(values) => updateMutation.mutate(values)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 space-y-3">
          <h2 className="text-lg font-semibold">Payments</h2>
          {payments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
          ) : (
            <div className="space-y-2">
              {payments.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between text-sm">
                  <div>
                    {payment.paymentDate} · {payment.method}
                  </div>
                  <div className="font-medium">
                    {formatMoney(payment.amountCents, "en-US", payment.currency)}
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="text-sm text-muted-foreground">
            Paid: {formatMoney(invoice.totals.paidCents, "en-US", invoice.currency)} · Due:{" "}
            {formatMoney(invoice.totals.dueCents, "en-US", invoice.currency)}
          </div>
        </CardContent>
      </Card>

      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Amount (cents)</Label>
              <Input
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(Number(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2">
              <Label>Payment Date</Label>
              <Input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                  <SelectItem value="CASH">Cash</SelectItem>
                  <SelectItem value="CARD">Card</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setPaymentDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="accent" onClick={() => recordPaymentMutation.mutate()}>
              Confirm Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
