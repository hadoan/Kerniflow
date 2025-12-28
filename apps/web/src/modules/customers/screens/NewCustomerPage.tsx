import React from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";
import { customersApi } from "@/lib/customers-api";
import { toast } from "sonner";
import {
  customerFormSchema,
  toCreateCustomerInput,
  getDefaultCustomerFormValues,
  type CustomerFormData,
} from "../schemas/customer-form.schema";

export default function NewCustomerPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const form = useForm<CustomerFormData>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: getDefaultCustomerFormValues(),
  });

  const createCustomerMutation = useMutation({
    mutationFn: async (data: CustomerFormData) => {
      const input = toCreateCustomerInput(data);
      return customersApi.createCustomer(input);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast.success("Customer created successfully!");
      navigate("/customers");
    },
    onError: (error) => {
      console.error("Error creating customer:", error);
      toast.error("Failed to create customer. Please try again.");
    },
  });

  const onSubmit = async (data: CustomerFormData) => {
    createCustomerMutation.mutate(data);
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/customers")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-h1 text-foreground">Create New Customer</h1>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => navigate("/customers")}
            disabled={createCustomerMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            variant="accent"
            onClick={form.handleSubmit(onSubmit)}
            disabled={createCustomerMutation.isPending}
            data-testid="submit-customer-button"
          >
            {createCustomerMutation.isPending ? "Creating..." : "Create Customer"}
          </Button>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} data-testid="customer-form">
        <Card>
          <CardContent className="p-8 space-y-6">
            {/* Basic Information */}
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-4">Basic Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label htmlFor="displayName">
                    Display Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="displayName"
                    {...form.register("displayName")}
                    placeholder="Company or person name"
                    data-testid="customer-displayName-input"
                  />
                  {form.formState.errors.displayName && (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.displayName.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    {...form.register("email")}
                    placeholder="customer@example.com"
                    data-testid="customer-email-input"
                  />
                  {form.formState.errors.email && (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.email.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    {...form.register("phone")}
                    placeholder="+49 30 12345678"
                    data-testid="customer-phone-input"
                  />
                </div>

                <div>
                  <Label htmlFor="vatId">VAT ID</Label>
                  <Input
                    id="vatId"
                    {...form.register("vatId")}
                    placeholder="DE123456789"
                    data-testid="customer-vatId-input"
                  />
                </div>
              </div>
            </div>

            {/* Billing Address */}
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-4">Billing Address</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label htmlFor="billingAddress.line1">Address Line 1</Label>
                  <Input
                    id="billingAddress.line1"
                    {...form.register("billingAddress.line1")}
                    placeholder="Street and number"
                    data-testid="customer-address-line1-input"
                  />
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="billingAddress.line2">Address Line 2</Label>
                  <Input
                    id="billingAddress.line2"
                    {...form.register("billingAddress.line2")}
                    placeholder="Apartment, suite, etc. (optional)"
                    data-testid="customer-address-line2-input"
                  />
                </div>

                <div>
                  <Label htmlFor="billingAddress.city">City</Label>
                  <Input
                    id="billingAddress.city"
                    {...form.register("billingAddress.city")}
                    placeholder="Berlin"
                    data-testid="customer-address-city-input"
                  />
                </div>

                <div>
                  <Label htmlFor="billingAddress.postalCode">Postal Code</Label>
                  <Input
                    id="billingAddress.postalCode"
                    {...form.register("billingAddress.postalCode")}
                    placeholder="10115"
                    data-testid="customer-address-postalCode-input"
                  />
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="billingAddress.country">Country</Label>
                  <Input
                    id="billingAddress.country"
                    {...form.register("billingAddress.country")}
                    placeholder="Germany"
                    data-testid="customer-address-country-input"
                  />
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                {...form.register("notes")}
                placeholder="Additional notes about this customer"
                rows={4}
                data-testid="customer-notes-input"
              />
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
