import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { Link, useLocation } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@corely/ui";
import { Button } from "@corely/ui";
import { Input } from "@corely/ui";
import { Label } from "@corely/ui";
import { Switch } from "@corely/ui";
import { Textarea } from "@corely/ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@corely/ui";
import { COUNTRY_OPTIONS } from "@corely/web-shared/lib/country-options";
import { taxApi } from "@corely/web-shared/lib/tax-api";
import {
  taxProfileFormSchema,
  toUpsertTaxProfileInput,
  getDefaultTaxProfileFormValues,
  taxProfileDtoToFormData,
  type TaxProfileFormData,
} from "../schemas/tax-profile-form.schema";
import {
  taxConsultantFormSchema,
  toUpsertTaxConsultantInput,
  type TaxConsultantFormData,
} from "../schemas/tax-consultant-form.schema";

const toDateInputValue = (value: Date): string => {
  if (Number.isNaN(value.getTime())) {
    return "";
  }
  return value.toISOString().slice(0, 10);
};

const getReturnTo = (state: unknown): string | null => {
  if (!state || typeof state !== "object") {
    return null;
  }
  const returnTo = (state as { returnTo?: unknown }).returnTo;
  return typeof returnTo === "string" && returnTo.startsWith("/") && !returnTo.startsWith("//")
    ? returnTo
    : null;
};

export default function TaxSettingsPage() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const location = useLocation();
  const returnTo = getReturnTo(location.state);

  // Load tax profile
  const { data: profile, isLoading } = useQuery({
    queryKey: ["tax-profile"],
    queryFn: () => taxApi.getProfile(),
  });

  const { data: consultantData, isLoading: isLoadingConsultant } = useQuery({
    queryKey: ["tax-consultant"],
    queryFn: () => taxApi.getConsultant(),
  });

  // Form setup
  const form = useForm<TaxProfileFormData>({
    resolver: zodResolver(taxProfileFormSchema),
    defaultValues: profile ? taxProfileDtoToFormData(profile) : getDefaultTaxProfileFormValues(),
  });

  const consultantForm = useForm<TaxConsultantFormData>({
    resolver: zodResolver(taxConsultantFormSchema),
    defaultValues: consultantData?.consultant ?? { name: "", email: "", phone: "", notes: "" },
  });

  // Reset form when profile loads
  React.useEffect(() => {
    if (profile) {
      form.reset(taxProfileDtoToFormData(profile));
    }
  }, [profile, form]);

  React.useEffect(() => {
    if (consultantData?.consultant) {
      consultantForm.reset({
        name: consultantData.consultant.name,
        email: consultantData.consultant.email ?? "",
        phone: consultantData.consultant.phone ?? "",
        notes: consultantData.consultant.notes ?? "",
      });
    }
  }, [consultantData, consultantForm]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (data: TaxProfileFormData) => {
      const input = toUpsertTaxProfileInput(data);
      return taxApi.upsertProfile(input);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["tax-profile"] });
      toast.success(t("tax.profile.saveSuccess"));
    },
    onError: (error) => {
      console.error("Error saving tax profile:", error);
      toast.error(t("tax.profile.saveFailed"));
    },
  });

  const onSubmit = (data: TaxProfileFormData) => {
    saveMutation.mutate({
      ...data,
      vatEnabled: data.regime === "STANDARD_VAT",
    });
  };

  const saveConsultant = useMutation({
    mutationFn: async (data: TaxConsultantFormData) => {
      const input = toUpsertTaxConsultantInput(data);
      return taxApi.upsertConsultant(input);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["tax-consultant"] });
      toast.success(t("tax.consultant.saveSuccess"));
    },
    onError: () => {
      toast.error(t("tax.consultant.saveFailed"));
    },
  });

  const regimeOptions = [
    { value: "SMALL_BUSINESS", label: t("tax.regimes.smallBusiness") },
    { value: "STANDARD_VAT", label: t("tax.regimes.standardVat") },
    { value: "VAT_EXEMPT", label: t("tax.regimes.vatExempt") },
  ];

  const exemptionParagraphs = [
    { value: "4.1", label: t("tax.exemptions.exportDeliveries") },
    { value: "4.2", label: t("tax.exemptions.intraCommunityDeliveries") },
    { value: "4.8", label: t("tax.exemptions.financialServices") },
    { value: "4.11", label: t("tax.exemptions.insuranceServices") },
    { value: "4.12", label: t("tax.exemptions.lettingLeasing") },
    { value: "4.14", label: t("tax.exemptions.medicalServices") },
    { value: "4.21", label: t("tax.exemptions.educationalServices") },
  ];

  const selectedRegime = form.watch("regime");
  const isVatExempt = selectedRegime === "VAT_EXEMPT";

  const filingOptions = [
    { value: "MONTHLY", label: t("tax.filing.monthly") },
    { value: "QUARTERLY", label: t("tax.filing.quarterly") },
    { value: "YEARLY", label: t("tax.filing.yearly") },
  ];

  if (isLoading || isLoadingConsultant) {
    return (
      <div className="p-6 lg:p-8">
        <div className="text-muted-foreground">{t("tax.loading")}</div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t("tax.title")}</h1>
        <p className="text-muted-foreground mt-1">{t("tax.subtitle")}</p>
      </div>
      {returnTo ? (
        <Button asChild variant="outline">
          <Link to={returnTo}>{t("common.goBack")}</Link>
        </Button>
      ) : null}

      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle>{t("tax.profile.title")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <p className="font-medium text-foreground">{t("tax.profile.vatEnabled")}</p>
                <p className="text-sm text-muted-foreground">{t("tax.profile.vatEnabledHelp")}</p>
              </div>
              <Switch checked={selectedRegime === "STANDARD_VAT"} disabled />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="country">{t("tax.profile.country")}</Label>
                <Controller
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <Select
                      value={field.value ?? "DE"}
                      onValueChange={field.onChange}
                      defaultValue={field.value ?? "DE"}
                      disabled
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t("tax.placeholders.country")} />
                      </SelectTrigger>
                      <SelectContent>
                        {COUNTRY_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <p className="text-xs text-muted-foreground mt-1">{t("tax.profile.countryHelp")}</p>
              </div>

              <div>
                <Label htmlFor="regime">{t("tax.profile.regime")}</Label>
                <Controller
                  control={form.control}
                  name="regime"
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={(regime) => {
                        field.onChange(regime);
                        form.setValue("vatEnabled", regime === "STANDARD_VAT", {
                          shouldDirty: true,
                        });
                      }}
                      defaultValue={field.value}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t("tax.placeholders.regime")} />
                      </SelectTrigger>
                      <SelectContent>
                        {regimeOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {form.formState.errors.regime && (
                  <p className="text-sm text-destructive mt-1">
                    {form.formState.errors.regime.message}
                  </p>
                )}
              </div>
            </div>

            {isVatExempt && (
              <div className="rounded-lg border p-4 bg-muted/50">
                <Label htmlFor="vatExemptionParagraph">{t("tax.profile.vatExemption")}</Label>
                <div className="mt-2">
                  <Controller
                    control={form.control}
                    name="vatExemptionParagraph"
                    render={({ field }) => (
                      <Select
                        value={field.value ?? undefined}
                        onValueChange={field.onChange}
                        defaultValue={field.value ?? undefined}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t("tax.placeholders.vatExemption")} />
                        </SelectTrigger>
                        <SelectContent>
                          {exemptionParagraphs.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("tax.profile.vatExemptionHelp")}
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <Label htmlFor="usesTaxAdvisor" className="base">
                  {t("tax.profile.usesAdvisor")}
                </Label>
                <p className="text-sm text-muted-foreground">{t("tax.profile.usesAdvisorHelp")}</p>
              </div>
              <Controller
                control={form.control}
                name="usesTaxAdvisor"
                render={({ field }) => (
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="vatId">{t("tax.profile.vatIdOptional")}</Label>
                <Input
                  id="vatId"
                  {...form.register("vatId")}
                  placeholder={t("tax.placeholders.vatId")}
                />
                {form.formState.errors.vatId && (
                  <p className="text-sm text-destructive mt-1">
                    {form.formState.errors.vatId.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="filingFrequency">{t("tax.profile.filingFrequency")}</Label>
                <Controller
                  control={form.control}
                  name="filingFrequency"
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t("tax.placeholders.filingFrequency")} />
                      </SelectTrigger>
                      <SelectContent>
                        {filingOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div>
                <Label htmlFor="vatAccountingMethod">{t("tax.profile.accountingMethod")}</Label>
                <Controller
                  control={form.control}
                  name="vatAccountingMethod"
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t("tax.placeholders.accountingMethod")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="IST">{t("tax.accounting.cashBasis")}</SelectItem>
                        <SelectItem value="SOLL">{t("tax.accounting.accrualBasis")}</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {t("tax.accounting.cashBasisHelp")}
                  <br />
                  {t("tax.accounting.accrualBasisHelp")}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="effectiveFrom">{t("tax.profile.effectiveFrom")}</Label>
                <Controller
                  control={form.control}
                  name="effectiveFrom"
                  render={({ field }) => (
                    <Input
                      id="effectiveFrom"
                      type="date"
                      value={toDateInputValue(field.value)}
                      onChange={(event) => {
                        const date = event.target.value
                          ? new Date(`${event.target.value}T00:00:00`)
                          : field.value;
                        field.onChange(date);
                      }}
                    />
                  )}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {t("tax.profile.effectiveFromHelp")}
                </p>
              </div>
              <div>
                <Label htmlFor="taxYearStartMonth">{t("tax.profile.taxYearStartMonth")}</Label>
                <Controller
                  control={form.control}
                  name="taxYearStartMonth"
                  render={({ field }) => (
                    <Select
                      value={field.value ? String(field.value) : ""}
                      onValueChange={(val) => field.onChange(val ? Number(val) : null)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t("tax.placeholders.month")} />
                      </SelectTrigger>
                      <SelectContent>
                        {[...Array(12)].map((_, idx) => (
                          <SelectItem key={idx + 1} value={String(idx + 1)}>
                            {new Date(0, idx).toLocaleString(i18n.language, { month: "long" })}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div>
                <Label htmlFor="localTaxOfficeName">{t("tax.profile.localTaxOffice")}</Label>
                <Input
                  id="localTaxOfficeName"
                  placeholder={t("tax.placeholders.localTaxOffice")}
                  {...form.register("localTaxOfficeName")}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => form.reset()}
                disabled={saveMutation.isPending}
              >
                {t("common.reset")}
              </Button>
              <Button type="submit" variant="default" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? t("common.saving") : t("tax.profile.save")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>

      <Card>
        <CardHeader>
          <CardTitle>{t("tax.consultant.title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form
            className="space-y-4"
            onSubmit={consultantForm.handleSubmit((data) => saveConsultant.mutate(data))}
          >
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="consultantName">{t("common.name")}</Label>
                <Input id="consultantName" {...consultantForm.register("name")} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="consultantEmail">{t("common.email")}</Label>
                <Input id="consultantEmail" {...consultantForm.register("email")} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="consultantPhone">{t("common.phone")}</Label>
                <Input id="consultantPhone" {...consultantForm.register("phone")} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="consultantNotes">{t("common.notes")}</Label>
                <Textarea id="consultantNotes" {...consultantForm.register("notes")} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="submit" disabled={saveConsultant.isPending}>
                {saveConsultant.isPending ? t("common.saving") : t("tax.consultant.save")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
