import React, { useEffect, useMemo, useState } from "react";
import type { SalesInvoiceDto } from "@corely/contracts";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { formatMoney } from "@/shared/lib/formatters";

export type InvoiceFormValues = {
  customerPartyId: string;
  currency: string;
  issueDate?: string;
  dueDate?: string;
  paymentTerms?: string;
  notes?: string;
  lineItems: Array<{
    id?: string;
    description: string;
    quantity: number;
    unitPriceCents: number;
    discountCents?: number;
  }>;
};

type InvoiceFormProps = {
  customers: Array<{ id: string; displayName: string }>;
  initial?: SalesInvoiceDto;
  disabled?: boolean;
  onSubmit: (values: InvoiceFormValues) => void;
};

type LineItem = {
  id?: string;
  description: string;
  quantity: number;
  unitPriceCents: number;
  discountCents: number;
};

export const InvoiceForm: React.FC<InvoiceFormProps> = ({
  customers,
  initial,
  disabled,
  onSubmit,
}) => {
  const [customerPartyId, setCustomerPartyId] = useState(initial?.customerPartyId ?? "");
  const [currency, setCurrency] = useState(initial?.currency ?? "EUR");
  const [issueDate, setIssueDate] = useState(initial?.issueDate ?? "");
  const [dueDate, setDueDate] = useState(initial?.dueDate ?? "");
  const [paymentTerms, setPaymentTerms] = useState(initial?.paymentTerms ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [lineItems, setLineItems] = useState<LineItem[]>(
    initial?.lineItems?.length
      ? initial.lineItems.map((item) => ({
          id: item.id,
          description: item.description,
          quantity: item.quantity,
          unitPriceCents: item.unitPriceCents,
          discountCents: item.discountCents ?? 0,
        }))
      : [{ description: "", quantity: 1, unitPriceCents: 0, discountCents: 0 }]
  );

  useEffect(() => {
    if (initial) {
      setCustomerPartyId(initial.customerPartyId);
      setCurrency(initial.currency);
      setIssueDate(initial.issueDate ?? "");
      setDueDate(initial.dueDate ?? "");
      setPaymentTerms(initial.paymentTerms ?? "");
      setNotes(initial.notes ?? "");
      setLineItems(
        initial.lineItems.map((item) => ({
          id: item.id,
          description: item.description,
          quantity: item.quantity,
          unitPriceCents: item.unitPriceCents,
          discountCents: item.discountCents ?? 0,
        }))
      );
    }
  }, [initial]);

  const totals = useMemo(() => {
    const subtotalCents = lineItems.reduce(
      (sum, item) => sum + item.quantity * item.unitPriceCents,
      0
    );
    const discountCents = lineItems.reduce((sum, item) => sum + (item.discountCents ?? 0), 0);
    const totalCents = Math.max(subtotalCents - discountCents, 0);
    return { subtotalCents, discountCents, totalCents };
  }, [lineItems]);

  const updateLineItem = (
    index: number,
    field: keyof InvoiceFormValues["lineItems"][number],
    value: string
  ) => {
    setLineItems((prev) => {
      const next = [...prev];
      const current = { ...next[index] };
      if (field === "quantity" || field === "unitPriceCents" || field === "discountCents") {
        current[field] = Number(value) || 0;
      } else {
        current[field] = value as any;
      }
      next[index] = current;
      return next;
    });
  };

  const addLineItem = () => {
    setLineItems((prev) => [
      ...prev,
      { description: "", quantity: 1, unitPriceCents: 0, discountCents: 0 },
    ]);
  };

  const removeLineItem = (index: number) => {
    setLineItems((prev) => (prev.length > 1 ? prev.filter((_, idx) => idx !== index) : prev));
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onSubmit({
      customerPartyId,
      currency,
      issueDate: issueDate || undefined,
      dueDate: dueDate || undefined,
      paymentTerms: paymentTerms || undefined,
      notes: notes || undefined,
      lineItems,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Customer</Label>
          <Select value={customerPartyId} onValueChange={setCustomerPartyId} disabled={disabled}>
            <SelectTrigger>
              <SelectValue placeholder="Select customer" />
            </SelectTrigger>
            <SelectContent>
              {customers.map((customer) => (
                <SelectItem key={customer.id} value={customer.id}>
                  {customer.displayName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Currency</Label>
          <Input
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            disabled={disabled}
          />
        </div>
        <div className="space-y-2">
          <Label>Issue Date</Label>
          <Input
            type="date"
            value={issueDate}
            onChange={(e) => setIssueDate(e.target.value)}
            disabled={disabled}
          />
        </div>
        <div className="space-y-2">
          <Label>Due Date</Label>
          <Input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            disabled={disabled}
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label>Payment Terms</Label>
          <Input
            value={paymentTerms}
            onChange={(e) => setPaymentTerms(e.target.value)}
            disabled={disabled}
          />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Line Items</Label>
          <Button type="button" variant="secondary" onClick={addLineItem} disabled={disabled}>
            Add Line
          </Button>
        </div>
        <div className="space-y-3">
          {lineItems.map((item, index) => (
            <div key={index} className="grid gap-3 md:grid-cols-6 items-end">
              <div className="md:col-span-2">
                <Label>Description</Label>
                <Input
                  value={item.description}
                  onChange={(e) => updateLineItem(index, "description", e.target.value)}
                  disabled={disabled}
                />
              </div>
              <div>
                <Label>Qty</Label>
                <Input
                  type="number"
                  value={item.quantity}
                  onChange={(e) => updateLineItem(index, "quantity", e.target.value)}
                  disabled={disabled}
                />
              </div>
              <div>
                <Label>Unit Price (cents)</Label>
                <Input
                  type="number"
                  value={item.unitPriceCents}
                  onChange={(e) => updateLineItem(index, "unitPriceCents", e.target.value)}
                  disabled={disabled}
                />
              </div>
              <div>
                <Label>Discount (cents)</Label>
                <Input
                  type="number"
                  value={item.discountCents ?? 0}
                  onChange={(e) => updateLineItem(index, "discountCents", e.target.value)}
                  disabled={disabled}
                />
              </div>
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => removeLineItem(index)}
                  disabled={disabled}
                >
                  Remove
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Notes</Label>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} disabled={disabled} />
      </div>

      <div className="border-t pt-4 flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Subtotal: {formatMoney(totals.subtotalCents, "en-US", currency)} | Discount:{" "}
          {formatMoney(totals.discountCents, "en-US", currency)}
        </div>
        <div className="text-lg font-semibold">
          Total: {formatMoney(totals.totalCents, "en-US", currency)}
        </div>
      </div>

      <Button type="submit" variant="accent" disabled={disabled || !customerPartyId}>
        Save Invoice
      </Button>
    </form>
  );
};
