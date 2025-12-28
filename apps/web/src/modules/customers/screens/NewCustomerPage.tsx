import React from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { customersApi } from "@/lib/customers-api";
import { toast } from "sonner";
import {
  customerFormSchema,
  toCreateCustomerInput,
  getDefaultCustomerFormValues,
  type CustomerFormData,
} from "../schemas/customer-form.schema";
import CustomerFormFields from "../components/CustomerFormFields";

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
          <CardContent className="p-8">
            <CustomerFormFields form={form} />
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
