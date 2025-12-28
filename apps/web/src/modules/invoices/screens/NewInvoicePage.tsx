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
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/shared/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { cn } from "@/shared/lib/utils";
import { customersApi } from "@/lib/customers-api";
import { invoicesApi } from "@/lib/invoices-api";
import { toast } from "sonner";
import CustomerFormFields from "@/modules/customers/components/CustomerFormFields";
import {
  customerFormSchema,
  getDefaultCustomerFormValues,
  toCreateCustomerInput,
  type CustomerFormData,
} from "@/modules/customers/schemas/customer-form.schema";
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

const generateInvoiceNumber = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const prefix = `${y}${m}${d}`;

  try {
    if (typeof window === "undefined" || !window.localStorage) {
      throw new Error("no window");
    }
    const key = "invoice-number-seq";
    const stored = window.localStorage.getItem(key);
    const [storedPrefix, storedCounter] = stored?.split("-") ?? [];
    const counter = storedPrefix === prefix ? Math.max(Number(storedCounter) + 1, 1) : 1;
    const next = `${prefix}-${String(counter).padStart(3, "0")}`;
    window.localStorage.setItem(key, `${prefix}-${counter}`);
    return next;
  } catch {
    const fallback = String(now.getTime()).slice(-5);
    return `${prefix}-${fallback}`;
  }
};

export default function NewInvoicePage() {
  const { i18n } = useTranslation();
  const locale = i18n.language === "de" ? "de-DE" : "en-DE";
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: customersData } = useQuery({
    queryKey: ["customers"],
    queryFn: () => customersApi.listCustomers(),
  });
  const customers = customersData?.customers ?? [];

  const defaultValues = {
    ...getDefaultInvoiceFormValues(),
    invoiceNumber: generateInvoiceNumber(),
  };
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false);
  const [newCustomerDialogOpen, setNewCustomerDialogOpen] = useState(false);
  const [lineItems, setLineItems] = useState<InvoiceLineFormData[]>(defaultValues.lineItems || []);

  const form = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues,
  });

  const customerForm = useForm<CustomerFormData>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: getDefaultCustomerFormValues(),
  });

  useEffect(() => {
    if (!newCustomerDialogOpen) {
      customerForm.reset(getDefaultCustomerFormValues());
    }
  }, [customerForm, newCustomerDialogOpen]);

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

  const createCustomerMutation = useMutation({
    mutationFn: async (data: CustomerFormData) => {
      const input = toCreateCustomerInput(data);
      return customersApi.createCustomer(input);
    },
    onSuccess: (customer) => {
      if (customer?.id) {
        void queryClient.invalidateQueries({ queryKey: ["customers"] });
        form.setValue("customerPartyId", customer.id, { shouldValidate: true, shouldDirty: true });
        toast.success("Customer created successfully!");
        setNewCustomerDialogOpen(false);
        setCustomerDialogOpen(false);
      } else {
        toast.error("Customer was created but no ID was returned.");
      }
    },
    onError: (error) => {
      console.error("Error creating customer:", error);
      toast.error("Failed to create customer. Please try again.");
    },
  });

  // Submit mutation
  const createInvoiceMutation = useMutation({
    mutationFn: async (data: InvoiceFormData) => {
      // Transform form data (Date -> ISO strings) to match API contract
      const input = toCreateInvoiceInput(data);
      return invoicesApi.createInvoice(input);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["invoices"] });
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

  // Get selected customer
  const selectedCustomer = customers.find((c) => c.id === form.watch("customerPartyId"));
  const selectedCustomerAddress = [
    selectedCustomer?.billingAddress?.line1,
    selectedCustomer?.billingAddress?.city,
    selectedCustomer?.billingAddress?.country,
  ]
    .filter(Boolean)
    .join(", ");

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
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <Label className="text-xs text-muted-foreground uppercase">Billed to</Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="gap-2"
                        onClick={() => {
                          setCustomerDialogOpen(false);
                          setNewCustomerDialogOpen(true);
                        }}
                      >
                        <Plus className="h-4 w-4" />
                        Add customer
                      </Button>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full justify-between text-left"
                      onClick={() => setCustomerDialogOpen(true)}
                      data-testid="invoice-customer-select"
                    >
                      <div className="flex flex-col items-start">
                        <span className="text-sm font-medium">
                          {selectedCustomer ? selectedCustomer.displayName : "Select a customer"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {selectedCustomerAddress ||
                            selectedCustomer?.email ||
                            "Search customers or add a new one"}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">Search</span>
                    </Button>
                    {form.formState.errors.customerPartyId && (
                      <p className="text-sm text-destructive">
                        {form.formState.errors.customerPartyId.message}
                      </p>
                    )}
                  </div>

                  {selectedCustomer && (
                    <div className="space-y-1 rounded-md border border-dashed border-border p-3">
                      <div className="text-lg font-semibold">{selectedCustomer.displayName}</div>
                      {selectedCustomerAddress && (
                        <div className="text-sm text-muted-foreground">
                          {selectedCustomerAddress}
                        </div>
                      )}
                      {selectedCustomer.email && (
                        <div className="text-sm text-muted-foreground">
                          {selectedCustomer.email}
                        </div>
                      )}
                      {selectedCustomer.vatId && (
                        <div className="text-sm text-muted-foreground">
                          VAT: {selectedCustomer.vatId}
                        </div>
                      )}
                    </div>
                  )}

                  <CommandDialog
                    open={customerDialogOpen}
                    onOpenChange={setCustomerDialogOpen}
                    contentClassName="animate-none data-[state=open]:animate-none data-[state=closed]:animate-none"
                  >
                    <DialogHeader className="sr-only">
                      <DialogTitle>Select customer</DialogTitle>
                    </DialogHeader>
                    <div className="flex items-center justify-between border-b px-4 py-3">
                      <div>
                        <div className="text-base font-semibold">Select customer</div>
                        <p className="text-sm text-muted-foreground">
                          Search existing clients or create a new one.
                        </p>
                      </div>
                    </div>
                    <CommandInput placeholder="Search by name, email, or VAT..." />
                    <CommandList>
                      <CommandEmpty>No customers found.</CommandEmpty>
                      <CommandGroup heading="Customers">
                        {customers.map((customer) => {
                          const address = [
                            customer.billingAddress?.line1,
                            customer.billingAddress?.city,
                            customer.billingAddress?.country,
                          ]
                            .filter(Boolean)
                            .join(", ");

                          return (
                            <CommandItem
                              key={customer.id}
                              value={customer.id}
                              data-testid={`invoice-customer-option-${customer.id}`}
                              onSelect={() => {
                                form.setValue("customerPartyId", customer.id, {
                                  shouldValidate: true,
                                  shouldDirty: true,
                                });
                                setCustomerDialogOpen(false);
                              }}
                            >
                              <div className="flex flex-col gap-1 py-1">
                                <span className="font-medium">{customer.displayName}</span>
                                <span className="text-xs text-muted-foreground">
                                  {address || customer.email || "No contact details"}
                                </span>
                              </div>
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    </CommandList>
                    <div className="flex justify-end border-t px-4 py-3">
                      <Button
                        type="button"
                        size="sm"
                        variant="accent"
                        className="gap-2"
                        onClick={() => {
                          setCustomerDialogOpen(false);
                          setNewCustomerDialogOpen(true);
                        }}
                      >
                        <Plus className="h-4 w-4" />
                        Add New Customer
                      </Button>
                    </div>
                  </CommandDialog>

                  <Dialog open={newCustomerDialogOpen} onOpenChange={setNewCustomerDialogOpen}>
                    <DialogContent className="max-w-3xl">
                      <DialogHeader className="space-y-2">
                        <DialogTitle>Add new client</DialogTitle>
                        <DialogDescription>
                          Capture a new billing contact without leaving the invoice.
                        </DialogDescription>
                      </DialogHeader>
                      <form
                        onSubmit={customerForm.handleSubmit((data) =>
                          createCustomerMutation.mutate(data)
                        )}
                        className="space-y-6"
                      >
                        <CustomerFormFields form={customerForm} />
                        <DialogFooter className="gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setNewCustomerDialogOpen(false)}
                            disabled={createCustomerMutation.isPending}
                          >
                            Cancel
                          </Button>
                          <Button
                            type="submit"
                            variant="accent"
                            disabled={createCustomerMutation.isPending}
                          >
                            {createCustomerMutation.isPending ? "Saving..." : "Save"}
                          </Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
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
                          className="w-full justify-start text-left font-normal"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {form.watch("serviceDateStart") && form.watch("serviceDateEnd") ? (
                            <>
                              {format(form.watch("serviceDateStart"), "dd.MM.yyyy")} →{" "}
                              {format(form.watch("serviceDateEnd"), "dd.MM.yyyy")}
                            </>
                          ) : (
                            <span className="text-muted-foreground">Select date range</span>
                          )}
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
                    <div className="flex gap-2">
                      <Input
                        {...form.register("invoiceNumber")}
                        data-testid="invoice-number-input"
                        className="font-medium"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => form.setValue("invoiceNumber", generateInvoiceNumber())}
                      >
                        Generate
                      </Button>
                    </div>
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
