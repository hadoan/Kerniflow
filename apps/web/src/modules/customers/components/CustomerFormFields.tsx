import React from "react";
import type { UseFormReturn } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { cn } from "@/shared/lib/utils";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";

import type { CustomerFormData } from "../schemas/customer-form.schema";

interface CustomerFormFieldsProps {
  form: UseFormReturn<CustomerFormData>;
  className?: string;
}

export function CustomerFormFields({ form, className }: CustomerFormFieldsProps) {
  const { t } = useTranslation();

  return (
    <div className={cn("space-y-6", className)}>
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">
          {t("customers.basicInformation")}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Label htmlFor="displayName">
              {t("customers.displayName")} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="displayName"
              {...form.register("displayName")}
              placeholder={t("customers.placeholders.displayName")}
              data-testid="customer-displayName-input"
            />
            {form.formState.errors.displayName && (
              <p className="text-sm text-destructive mt-1">
                {form.formState.errors.displayName.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="email">{t("customers.email")}</Label>
            <Input
              id="email"
              type="email"
              {...form.register("email")}
              placeholder={t("customers.placeholders.email")}
              data-testid="customer-email-input"
            />
            {form.formState.errors.email && (
              <p className="text-sm text-destructive mt-1">{form.formState.errors.email.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="phone">{t("customers.phone")}</Label>
            <Input
              id="phone"
              {...form.register("phone")}
              placeholder={t("customers.placeholders.phone")}
              data-testid="customer-phone-input"
            />
          </div>

          <div>
            <Label htmlFor="vatId">{t("customers.vatId")}</Label>
            <Input
              id="vatId"
              {...form.register("vatId")}
              placeholder={t("customers.placeholders.vatId")}
              data-testid="customer-vatId-input"
            />
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">
          {t("customers.billingAddress")}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Label htmlFor="billingAddress.line1">{t("customers.addressLine1")}</Label>
            <Input
              id="billingAddress.line1"
              {...form.register("billingAddress.line1")}
              placeholder={t("customers.placeholders.addressLine1")}
              data-testid="customer-address-line1-input"
            />
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="billingAddress.line2">{t("customers.addressLine2")}</Label>
            <Input
              id="billingAddress.line2"
              {...form.register("billingAddress.line2")}
              placeholder={t("customers.placeholders.addressLine2")}
              data-testid="customer-address-line2-input"
            />
          </div>

          <div>
            <Label htmlFor="billingAddress.city">{t("customers.city")}</Label>
            <Input
              id="billingAddress.city"
              {...form.register("billingAddress.city")}
              placeholder={t("customers.placeholders.city")}
              data-testid="customer-address-city-input"
            />
          </div>

          <div>
            <Label htmlFor="billingAddress.postalCode">{t("customers.postalCode")}</Label>
            <Input
              id="billingAddress.postalCode"
              {...form.register("billingAddress.postalCode")}
              placeholder={t("customers.placeholders.postalCode")}
              data-testid="customer-address-postalCode-input"
            />
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="billingAddress.country">{t("customers.country")}</Label>
            <Input
              id="billingAddress.country"
              {...form.register("billingAddress.country")}
              placeholder={t("customers.placeholders.country")}
              data-testid="customer-address-country-input"
            />
          </div>
        </div>
      </div>

      <div>
        <Label htmlFor="notes">{t("customers.notes")}</Label>
        <Textarea
          id="notes"
          {...form.register("notes")}
          placeholder={t("customers.placeholders.notes")}
          rows={4}
          data-testid="customer-notes-input"
        />
      </div>
    </div>
  );
}

export default CustomerFormFields;
