import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Plus, Trash2, ArrowLeft } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { Card, CardContent } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Calendar } from "@/shared/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { cn } from "@/shared/lib/utils";
import { getClients } from "@/shared/mock/mockApi";
import { invoicesApi } from "@/lib/invoices-api";
import { toast } from "sonner";
import {
  invoiceFormSchema,
  toCreateInvoiceInput,
  getDefaultInvoiceFormValues,
  type InvoiceFormData,
  type InvoiceLineFormData,
} from "../schemas/invoice-form.schema";

const DEFAULT_VAT_RATE = 19;
const AVAILABLE_VAT_RATES = [0, 7, 19];
const UNITS = ["h", "day", "piece", "service"];

// Your address (from the image)
const FREELANCER_INFO = {
  name: "Manh Ha Doan",
  address: "Wolfsberger Str. 11",
  postalCode: "12623",
  city: "Berlin",
  country: "Germany",
};

export default function NewInvoicePage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === "de" ? "de-DE" : "en-DE";
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: getClients,
  });

  const defaultValues = getDefaultInvoiceFormValues();
  const [lineItems, setLineItems] = useState<InvoiceLineFormData[]>(defaultValues.lineItems || []);

  const form = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues,
  });

  // Calculate totals
  const calculateTotals = () => {
    const subtotalCents = lineItems.reduce((sum, item) => sum + item.qty * item.unitPriceCents, 0);
    const vatRate = form.watch("vatRate") || DEFAULT_VAT_RATE;
    const vatCents = Math.round(subtotalCents * (vatRate / 100));
    const totalCents = subtotalCents + vatCents;

    return {
      subtotalCents,
      vatCents,
      totalCents,
      vatRate,
    };
  };

  const { subtotalCents, vatCents, totalCents, vatRate } = calculateTotals();

  // Keep react-hook-form in sync with line item state for submission
  useEffect(() => {
    form.setValue("lineItems", lineItems, { shouldValidate: false });
  }, [form, lineItems]);

  // Format money
  const formatMoney = (cents: number) => {
    const amount = cents / 100;
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  };

  // Add line item
  const addLineItem = () => {
    setLineItems([
      ...lineItems,
      {
        description: "",
        qty: 1,
        unit: "h",
        unitPriceCents: 0,
      },
    ]);
  };

  // Remove line item
  const removeLineItem = (index: number) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((_, i) => i !== index));
    }
  };

  // Update line item
  const updateLineItem = (
    index: number,
    field: keyof InvoiceLineFormData,
    value: string | number
  ) => {
    const updated = [...lineItems];
    updated[index] = {
      ...updated[index],
      [field]: value,
    };
    setLineItems(updated);
  };

  // Submit mutation
  const createInvoiceMutation = useMutation({
    mutationFn: async (data: InvoiceFormData) => {
      // Transform form data (Date → ISO strings) to match API contract
      const input = toCreateInvoiceInput(data);
      return invoicesApi.createInvoice(input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Invoice created successfully!");
      navigate("/invoices");
    },
    onError: (error) => {
      console.error("Error creating invoice:", error);
      toast.error("Failed to create invoice. Please try again.");
    },
  });

  // Submit handler
  const onSubmit = async (data: InvoiceFormData) => {
    createInvoiceMutation.mutate(data);
  };

  // Get selected client
  const selectedClient = clients.find((c) => c.id === form.watch("customerPartyId"));

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/invoices")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-h1 text-foreground">Create New Invoice</h1>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => navigate("/invoices")}
            disabled={createInvoiceMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            variant="accent"
            onClick={form.handleSubmit(onSubmit)}
            data-testid="submit-invoice-button"
            disabled={createInvoiceMutation.isPending}
          >
            {createInvoiceMutation.isPending ? "Creating..." : "Create Invoice"}
          </Button>
        </div>
      </div>

      <form data-testid="invoice-form" onSubmit={form.handleSubmit(onSubmit)}>
        <Card>
          <CardContent className="p-8 space-y-8">
            {/* Header with addresses */}
            <div className="space-y-6">
              {/* Your address */}
              <div className="text-sm text-muted-foreground border-b border-dashed border-border pb-4">
                {FREELANCER_INFO.name} | {FREELANCER_INFO.address} | {FREELANCER_INFO.postalCode}{" "}
                {FREELANCER_INFO.city}, {FREELANCER_INFO.country}
              </div>

              {/* Billed to & Invoice metadata */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left column - Billed to */}
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs text-muted-foreground uppercase">Billed to</Label>
                    <Select
                      value={form.watch("customerPartyId")}
                      onValueChange={(value) => form.setValue("customerPartyId", value)}
                    >
                      <SelectTrigger className="mt-2" data-testid="invoice-customer-select">
                        <SelectValue placeholder="Select a client" />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.map((client) => (
                          <SelectItem
                            key={client.id}
                            value={client.id}
                            data-testid={`invoice-customer-option-${client.id}`}
                          >
                            {client.company || client.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {form.formState.errors.customerPartyId && (
                      <p className="text-sm text-destructive mt-1">
                        {form.formState.errors.customerPartyId.message}
                      </p>
                    )}
                  </div>

                  {selectedClient && (
                    <div className="space-y-1">
                      <div className="text-2xl font-semibold">
                        {selectedClient.company || selectedClient.name}
                      </div>
                      {selectedClient.address && (
                        <div className="text-sm">{selectedClient.address}</div>
                      )}
                      {selectedClient.city && (
                        <div className="text-sm">
                          {selectedClient.city}
                          {selectedClient.country && `, ${selectedClient.country}`}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Right column - Invoice metadata */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Invoice date */}
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground uppercase">Invoice date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !form.watch("invoiceDate") && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {form.watch("invoiceDate") ? (
                            format(form.watch("invoiceDate"), "dd/MM/yyyy")
                          ) : (
                            <span>Select date</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={form.watch("invoiceDate")}
                          onSelect={(date) => form.setValue("invoiceDate", date || new Date())}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Service date */}
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground uppercase">Service date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal text-accent"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          Select date range
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="range"
                          selected={{
                            from: form.watch("serviceDateStart"),
                            to: form.watch("serviceDateEnd"),
                          }}
                          onSelect={(range) => {
                            form.setValue("serviceDateStart", range?.from);
                            form.setValue("serviceDateEnd", range?.to);
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Invoice number */}
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground uppercase">
                      Invoice number
                    </Label>
                    <Input
                      {...form.register("invoiceNumber")}
                      data-testid="invoice-number-input"
                      className="font-medium"
                    />
                    {form.formState.errors.invoiceNumber && (
                      <p className="text-sm text-destructive">
                        {form.formState.errors.invoiceNumber.message}
                      </p>
                    )}
                  </div>

                  {/* Due date */}
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground uppercase">Due date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            form.watch("dueDate") ? "" : "text-accent"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {form.watch("dueDate")
                            ? format(form.watch("dueDate"), "dd/MM/yyyy")
                            : "Select date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={form.watch("dueDate")}
                          onSelect={(date) => form.setValue("dueDate", date)}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </div>
            </div>

            {/* Line items table */}
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left text-xs font-medium text-muted-foreground uppercase px-4 py-3">
                        Description
                      </th>
                      <th className="text-left text-xs font-medium text-muted-foreground uppercase px-4 py-3 w-32">
                        Quantity
                      </th>
                      <th className="text-left text-xs font-medium text-muted-foreground uppercase px-4 py-3 w-32">
                        Rate
                      </th>
                      <th className="text-right text-xs font-medium text-muted-foreground uppercase px-4 py-3 w-32">
                        Total
                      </th>
                      <th className="w-12"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineItems.map((item, index) => {
                      const total = item.qty * item.unitPriceCents;
                      return (
                        <tr key={index} className="border-b border-border">
                          <td className="px-4 py-3">
                            <Input
                              data-testid={`invoice-line-description-${index}`}
                              value={item.description}
                              onChange={(e) => updateLineItem(index, "description", e.target.value)}
                              placeholder="Description"
                              className="border-0 focus-visible:ring-0 px-0"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Input
                                data-testid={`invoice-line-qty-${index}`}
                                type="number"
                                value={item.qty}
                                onChange={(e) =>
                                  updateLineItem(index, "qty", parseFloat(e.target.value) || 0)
                                }
                                className="w-16 border-0 focus-visible:ring-0 px-0"
                                min="0"
                                step="0.01"
                              />
                              <Select
                                value={item.unit}
                                onValueChange={(value) => updateLineItem(index, "unit", value)}
                              >
                                <SelectTrigger className="w-20 h-8 border-0">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {UNITS.map((unit) => (
                                    <SelectItem key={unit} value={unit}>
                                      {unit}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center">
                              <Input
                                data-testid={`invoice-line-rate-${index}`}
                                type="number"
                                value={item.unitPriceCents / 100}
                                onChange={(e) =>
                                  updateLineItem(
                                    index,
                                    "unitPriceCents",
                                    Math.round((parseFloat(e.target.value) || 0) * 100)
                                  )
                                }
                                className="border-0 focus-visible:ring-0 px-0"
                                min="0"
                                step="0.01"
                              />
                              <span className="ml-2 text-sm text-muted-foreground">EUR</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right font-medium">{formatMoney(total)}</td>
                          <td className="px-4 py-3">
                            {lineItems.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeLineItem(index)}
                                className="h-8 w-8"
                              >
                                <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Add line button */}
              <button
                type="button"
                onClick={addLineItem}
                data-testid="add-invoice-line"
                className="w-full border-2 border-dashed border-accent rounded-lg py-3 px-4 text-accent hover:bg-accent/5 transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add a line
              </button>
            </div>

            {/* Totals */}
            <div className="flex justify-end">
              <div className="w-full lg:w-1/2 space-y-3">
                <div className="flex justify-between items-center pb-3">
                  <span className="text-sm font-medium">Total amount (Net)</span>
                  <span className="text-lg font-semibold">{formatMoney(subtotalCents)}</span>
                </div>

                <div className="flex justify-between items-center pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">VAT</span>
                    <Select
                      value={String(vatRate)}
                      onValueChange={(value) => form.setValue("vatRate", parseInt(value))}
                    >
                      <SelectTrigger className="w-24 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {AVAILABLE_VAT_RATES.map((rate) => (
                          <SelectItem key={rate} value={String(rate)}>
                            {rate}%
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <span className="text-lg font-semibold">{formatMoney(vatCents)}</span>
                </div>

                <div className="flex justify-between items-center pt-3 border-t border-border">
                  <span className="text-base font-semibold">Total amount (Gross)</span>
                  <span className="text-xl font-bold">{formatMoney(totalCents)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
