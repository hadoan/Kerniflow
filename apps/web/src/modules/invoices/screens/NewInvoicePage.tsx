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
import {
  customerFormSchema,
  getDefaultCustomerFormValues,
  toCreateCustomerInput,
  type CustomerFormData,
} from "@/modules/customers";
import {
  invoiceFormSchema,
  toCreateInvoiceInput,
  getDefaultInvoiceFormValues,
  type InvoiceFormData,
  type InvoiceLineFormData,
} from "../schemas/invoice-form.schema";
import type { InvoiceStatus } from "@corely/contracts";

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
  const { t, i18n } = useTranslation();
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
  const [targetStatus, setTargetStatus] = useState<InvoiceStatus>("DRAFT");

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
        toast.success(t("common.success"));
        setNewCustomerDialogOpen(false);
        setCustomerDialogOpen(false);
      } else {
        toast.error(t("common.error"));
      }
    },
    onError: (error) => {
      console.error("Error creating customer:", error);
      toast.error(t("common.error"));
    },
  });

  // Submit mutation
  const createInvoiceMutation = useMutation({
    mutationFn: async (data: InvoiceFormData) => {
      const input = toCreateInvoiceInput(data);
      return invoicesApi.createInvoice(input);
    },
    onError: (error) => {
      console.error("Error creating invoice:", error);
      toast.error(t("common.error"));
    },
  });

  const runStatusFlow = React.useCallback(
    async (invoiceId: string, currentStatus: InvoiceStatus, desiredStatus: InvoiceStatus) => {
      if (desiredStatus === currentStatus) {
        return currentStatus;
      }

      try {
        if (desiredStatus === "ISSUED") {
          await invoicesApi.finalizeInvoice(invoiceId);
          return "ISSUED";
        }
        if (desiredStatus === "SENT") {
          if (currentStatus === "DRAFT") {
            await invoicesApi.finalizeInvoice(invoiceId);
          }
          await invoicesApi.sendInvoice(invoiceId);
          return "SENT";
        }
        if (desiredStatus === "CANCELED") {
          await invoicesApi.cancelInvoice(invoiceId, "Canceled from form");
          return "CANCELED";
        }
        return currentStatus;
      } catch (err) {
        console.error("Status change failed", err);
        toast.error("Could not update invoice status");
        return currentStatus;
      }
    },
    []
  );

  // Submit handler
  const onSubmit = async (data: InvoiceFormData) => {
    try {
      const invoice = await createInvoiceMutation.mutateAsync(data);
      const finalStatus = await runStatusFlow(invoice.id, invoice.status ?? "DRAFT", targetStatus);
      void queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success(
        finalStatus === targetStatus ? t("invoices.created") : "Invoice saved (status unchanged)"
      );
      navigate("/invoices");
    } catch {
      // handled in mutation callbacks
    }
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
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/invoices")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-h1 text-foreground">{t("invoices.createNewInvoice")}</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-48">
            <Label className="text-xs text-muted-foreground">Status</Label>
            <Select
              value={targetStatus}
              onValueChange={(val: InvoiceStatus) => setTargetStatus(val)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="ISSUED">Issued</SelectItem>
                <SelectItem value="SENT">Sent</SelectItem>
                <SelectItem value="CANCELED">Canceled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            variant="outline"
            onClick={() => navigate("/invoices")}
            disabled={createInvoiceMutation.isPending}
          >
            {t("common.cancel")}
          </Button>
          <Button
            variant="accent"
            onClick={form.handleSubmit(onSubmit)}
            data-testid="submit-invoice-button"
            disabled={createInvoiceMutation.isPending}
          >
            {createInvoiceMutation.isPending ? t("invoices.creating") : t("invoices.createInvoice")}
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
                      <Label className="text-xs text-muted-foreground uppercase">
                        {t("invoices.billedTo")}
                      </Label>
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
                        {t("customers.addCustomer")}
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
                          {selectedCustomer
                            ? selectedCustomer.displayName
                            : t("customers.selectCustomer")}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {selectedCustomerAddress ||
                            selectedCustomer?.email ||
                            t("customers.searchOrAdd")}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">{t("common.search")}</span>
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
                      <DialogTitle>{t("customers.wizard.selectCustomer")}</DialogTitle>
                    </DialogHeader>
                    <div className="flex items-center justify-between border-b px-4 py-3">
                      <div>
                        <div className="text-base font-semibold">
                          {t("customers.wizard.selectCustomer")}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {t("customers.selectExisting")}
                        </p>
                      </div>
                    </div>
                    <CommandInput placeholder={t("customers.searchCustomers")} />
                    <CommandList>
                      <CommandEmpty>{t("customers.noCustomersFound")}</CommandEmpty>
                      <CommandGroup heading={t("customers.title")}>
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
                        {t("customers.addNewCustomer")}
                      </Button>
                    </div>
                  </CommandDialog>

                  <Dialog open={newCustomerDialogOpen} onOpenChange={setNewCustomerDialogOpen}>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader className="space-y-2">
                        <DialogTitle>{t("customers.addNewClient")}</DialogTitle>
                        <DialogDescription>{t("customers.createDescription")}</DialogDescription>
                      </DialogHeader>
                      <form
                        onSubmit={customerForm.handleSubmit((data) =>
                          createCustomerMutation.mutate(data)
                        )}
                        className="space-y-6"
                      >
                        {/* Basic Information */}
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="displayName">
                              {t("customers.displayName")}{" "}
                              <span className="text-destructive">*</span>
                            </Label>
                            <Input
                              id="displayName"
                              {...customerForm.register("displayName")}
                              placeholder={t("customers.placeholders.displayName")}
                              data-testid="customer-displayName-input"
                            />
                            {customerForm.formState.errors.displayName && (
                              <p className="text-sm text-destructive mt-1">
                                {customerForm.formState.errors.displayName.message}
                              </p>
                            )}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="email">{t("customers.email")}</Label>
                              <Input
                                id="email"
                                type="email"
                                {...customerForm.register("email")}
                                placeholder={t("customers.placeholders.email")}
                                data-testid="customer-email-input"
                              />
                              {customerForm.formState.errors.email && (
                                <p className="text-sm text-destructive mt-1">
                                  {customerForm.formState.errors.email.message}
                                </p>
                              )}
                            </div>

                            <div>
                              <Label htmlFor="vatId">{t("customers.vatId")}</Label>
                              <Input
                                id="vatId"
                                {...customerForm.register("vatId")}
                                placeholder={t("customers.placeholders.vatId")}
                                data-testid="customer-vatId-input"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Billing Address */}
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                              <Label htmlFor="billingAddress.line1">
                                {t("customers.addressLine1")}
                              </Label>
                              <Input
                                id="billingAddress.line1"
                                {...customerForm.register("billingAddress.line1")}
                                placeholder={t("customers.placeholders.addressLine1")}
                                data-testid="customer-address-line1-input"
                              />
                            </div>

                            <div className="md:col-span-2">
                              <Label htmlFor="billingAddress.line2">
                                {t("customers.addressLine2")}
                              </Label>
                              <Input
                                id="billingAddress.line2"
                                {...customerForm.register("billingAddress.line2")}
                                placeholder={t("customers.placeholders.addressLine2")}
                                data-testid="customer-address-line2-input"
                              />
                            </div>

                            <div>
                              <Label htmlFor="billingAddress.city">{t("customers.city")}</Label>
                              <Input
                                id="billingAddress.city"
                                {...customerForm.register("billingAddress.city")}
                                placeholder={t("customers.placeholders.city")}
                                data-testid="customer-address-city-input"
                              />
                            </div>

                            <div>
                              <Label htmlFor="billingAddress.postalCode">
                                {t("customers.postalCode")}
                              </Label>
                              <Input
                                id="billingAddress.postalCode"
                                {...customerForm.register("billingAddress.postalCode")}
                                placeholder={t("customers.placeholders.postalCode")}
                                data-testid="customer-address-postalCode-input"
                              />
                            </div>

                            <div className="md:col-span-2">
                              <Label htmlFor="billingAddress.country">
                                {t("customers.country")}
                              </Label>
                              <Input
                                id="billingAddress.country"
                                {...customerForm.register("billingAddress.country")}
                                placeholder={t("customers.placeholders.country")}
                                data-testid="customer-address-country-input"
                              />
                            </div>
                          </div>
                        </div>

                        <DialogFooter className="gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setNewCustomerDialogOpen(false)}
                            disabled={createCustomerMutation.isPending}
                          >
                            {t("common.cancel")}
                          </Button>
                          <Button
                            type="submit"
                            variant="accent"
                            disabled={createCustomerMutation.isPending}
                          >
                            {createCustomerMutation.isPending
                              ? t("invoices.saving")
                              : t("common.save")}
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
                    <Label className="text-xs text-muted-foreground uppercase">
                      {t("invoices.invoiceDate")}
                    </Label>
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
                            <span>{t("invoices.selectDate")}</span>
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
                    <Label className="text-xs text-muted-foreground uppercase">
                      {t("invoices.serviceDate")}
                    </Label>
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
                            <span className="text-muted-foreground">
                              {t("invoices.selectDateRange")}
                            </span>
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
                      {t("invoices.invoiceNumberLabel")}
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
                        {t("invoices.generate")}
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
                    <Label className="text-xs text-muted-foreground uppercase">
                      {t("invoices.dueDate")}
                    </Label>
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
                            : t("invoices.selectDate")}
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
                        {t("invoices.description")}
                      </th>
                      <th className="text-left text-xs font-medium text-muted-foreground uppercase px-4 py-3 w-32">
                        {t("invoices.quantity")}
                      </th>
                      <th className="text-left text-xs font-medium text-muted-foreground uppercase px-4 py-3 w-32">
                        {t("invoices.rate")}
                      </th>
                      <th className="text-right text-xs font-medium text-muted-foreground uppercase px-4 py-3 w-32">
                        {t("invoices.total")}
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
                {t("invoices.addLine")}
              </button>
            </div>

            {/* Totals */}
            <div className="flex justify-end">
              <div className="w-full lg:w-1/2 space-y-3">
                <div className="flex justify-between items-center pb-3">
                  <span className="text-sm font-medium">{t("invoices.totalAmountNet")}</span>
                  <span className="text-lg font-semibold">{formatMoney(subtotalCents)}</span>
                </div>

                <div className="flex justify-between items-center pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{t("invoices.vatAmount")}</span>
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
                  <span className="text-base font-semibold">{t("invoices.totalAmountGross")}</span>
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
