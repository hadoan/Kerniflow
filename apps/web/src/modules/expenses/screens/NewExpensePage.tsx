import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { z } from "zod";

import { Card, CardContent } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Textarea } from "@/shared/ui/textarea";
import { expensesApi } from "@/lib/expenses-api";

const expenseFormSchema = z.object({
  merchantName: z.string().min(1, "Merchant is required"),
  expenseDate: z.string().min(1, "Date is required"),
  amount: z.string().min(1, "Amount is required"),
  currency: z.string().default("EUR"),
  category: z.string().optional(),
  vatRate: z.string().optional(),
  notes: z.string().optional(),
});

type ExpenseFormValues = z.infer<typeof expenseFormSchema>;

const CATEGORY_OPTIONS = [
  "office_supplies",
  "software",
  "travel",
  "meals",
  "home_office",
  "education",
  "hardware",
  "phone_internet",
  "other",
] as const;

const VAT_OPTIONS = ["0", "7", "19"];

export default function NewExpensePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      merchantName: "",
      expenseDate: new Date().toISOString().slice(0, 10),
      amount: "",
      currency: "EUR",
      category: undefined,
      vatRate: "19",
      notes: "",
    },
  });

  const createExpenseMutation = useMutation({
    mutationFn: async (values: ExpenseFormValues) => {
      const totalAmountCents = Math.round(parseFloat(values.amount || "0") * 100);
      return expensesApi.createExpense({
        merchantName: values.merchantName,
        expenseDate: values.expenseDate,
        totalAmountCents,
        // Some backends still expect totalCents; send both for compatibility
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        totalCents: totalAmountCents,
        currency: values.currency,
        category: values.category,
        notes: values.notes,
        vatRate: values.vatRate ? Number(values.vatRate) : undefined,
      });
    },
    onSuccess: () => {
      setSuccessMessage(t("common.success"));
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      setTimeout(() => navigate("/expenses"), 500);
    },
  });

  const onSubmit = (values: ExpenseFormValues) => {
    setSuccessMessage(null);
    createExpenseMutation.mutate(values);
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/expenses")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-h1 text-foreground">{t("expenses.addExpense")}</h1>
        </div>
        <Button variant="outline" onClick={() => navigate("/expenses")}>
          {t("common.cancel")}
        </Button>
      </div>

      <form
        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
        onSubmit={form.handleSubmit(onSubmit)}
        data-testid="expense-form"
      >
        <Card className="lg:col-span-2">
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">{t("expenses.category")}</Label>
                <select
                  id="category"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  data-testid="expense-category"
                  {...form.register("category")}
                  defaultValue=""
                >
                  <option value="" disabled>
                    {t("common.select")}
                  </option>
                  {CATEGORY_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {t(`expenses.categories.${option}`)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="merchantName">{t("expenses.merchant")}</Label>
                <Input
                  id="merchantName"
                  placeholder="e.g. Internet subscription"
                  {...form.register("merchantName")}
                  data-testid="expense-description"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expenseDate">{t("expenses.date")}</Label>
                <Input type="date" id="expenseDate" {...form.register("expenseDate")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">{t("expenses.amount")}</Label>
                <div className="flex gap-2">
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    {...form.register("amount")}
                    data-testid="expense-amount"
                  />
                  <Select
                    value={form.watch("currency")}
                    onValueChange={(value) => form.setValue("currency", value)}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EUR">EUR (€)</SelectItem>
                      <SelectItem value="USD">USD ($)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t("expenses.vat")}</Label>
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.watch("vatRate")}
                  onChange={(event) => form.setValue("vatRate", event.target.value)}
                >
                  {VAT_OPTIONS.map((rate) => (
                    <option key={rate} value={rate}>
                      {rate}%
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">{t("expenses.notes")}</Label>
              <Textarea
                id="notes"
                rows={3}
                placeholder={t("expenses.notes")}
                {...form.register("notes")}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="text-sm text-muted-foreground">
                {t("expenses.receipt")}: {t("common.optional", { defaultValue: "Optional" })}
              </div>
              <div className="border border-dashed border-border rounded-md p-4 text-center text-sm text-muted-foreground">
                {t("expenses.noExpensesDescription")}
              </div>
            </CardContent>
          </Card>
          <Button
            variant="accent"
            type="submit"
            data-testid="expense-submit"
            disabled={createExpenseMutation.isPending}
          >
            {createExpenseMutation.isPending ? t("common.loading") : t("common.save")}
          </Button>
          {successMessage && (
            <div className="text-sm text-emerald-600" data-testid="expense-success" role="status">
              {successMessage}
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
