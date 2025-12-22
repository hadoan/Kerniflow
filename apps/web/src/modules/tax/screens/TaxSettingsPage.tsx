import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "../../../shared/ui/card";
import { Button } from "../../../shared/ui/button";
import { Input } from "../../../shared/ui/input";
import { Label } from "../../../shared/ui/label";
import { taxApi } from "../../../lib/tax-api";
import {
  taxProfileFormSchema,
  toUpsertTaxProfileInput,
  getDefaultTaxProfileFormValues,
  taxProfileDtoToFormData,
  type TaxProfileFormData,
} from "../schemas/tax-profile-form.schema";

export default function TaxSettingsPage() {
  const queryClient = useQueryClient();

  // Load tax profile
  const { data: profile, isLoading } = useQuery({
    queryKey: ["tax-profile"],
    queryFn: () => taxApi.getProfile(),
  });

  // Form setup
  const form = useForm<TaxProfileFormData>({
    resolver: zodResolver(taxProfileFormSchema),
    defaultValues: profile ? taxProfileDtoToFormData(profile) : getDefaultTaxProfileFormValues(),
  });

  // Reset form when profile loads
  React.useEffect(() => {
    if (profile) {
      form.reset(taxProfileDtoToFormData(profile));
    }
  }, [profile, form]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (data: TaxProfileFormData) => {
      const input = toUpsertTaxProfileInput(data);
      return taxApi.upsertProfile(input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tax-profile"] });
      toast.success("Tax profile saved successfully");
    },
    onError: (error) => {
      console.error("Error saving tax profile:", error);
      toast.error("Failed to save tax profile");
    },
  });

  const onSubmit = (data: TaxProfileFormData) => {
    saveMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="text-muted-foreground">Loading tax settings...</div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Tax Settings</h1>
        <p className="text-muted-foreground mt-1">Configure your tax profile and VAT settings</p>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle>Tax Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="country">Country</Label>
                <select
                  id="country"
                  className="w-full px-3 py-2 border rounded-md"
                  {...form.register("country")}
                  disabled
                >
                  <option value="DE">Germany (DE)</option>
                </select>
                <p className="text-xs text-muted-foreground mt-1">
                  Currently only Germany is supported
                </p>
              </div>

              <div>
                <Label htmlFor="regime">Tax Regime</Label>
                <select
                  id="regime"
                  className="w-full px-3 py-2 border rounded-md"
                  {...form.register("regime")}
                >
                  <option value="SMALL_BUSINESS">Small Business (Kleinunternehmer §19 UStG)</option>
                  <option value="STANDARD_VAT">Standard VAT</option>
                </select>
                {form.formState.errors.regime && (
                  <p className="text-sm text-destructive mt-1">
                    {form.formState.errors.regime.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="vatId">VAT ID (optional)</Label>
                <Input id="vatId" {...form.register("vatId")} placeholder="DE123456789" />
                {form.formState.errors.vatId && (
                  <p className="text-sm text-destructive mt-1">
                    {form.formState.errors.vatId.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="filingFrequency">Filing Frequency</Label>
                <select
                  id="filingFrequency"
                  className="w-full px-3 py-2 border rounded-md"
                  {...form.register("filingFrequency")}
                >
                  <option value="MONTHLY">Monthly</option>
                  <option value="QUARTERLY">Quarterly</option>
                  <option value="YEARLY">Yearly</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => form.reset()}
                disabled={saveMutation.isPending}
              >
                Reset
              </Button>
              <Button type="submit" variant="default" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Saving..." : "Save Tax Profile"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>

      <Card>
        <CardHeader>
          <CardTitle>Tax Codes</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Tax code management will be available in a future update.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
