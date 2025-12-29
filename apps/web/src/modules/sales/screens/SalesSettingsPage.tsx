import React, { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Switch } from "@/shared/ui/switch";
import { salesApi } from "@/lib/sales-api";
import { salesQueryKeys } from "../queries/sales.queryKeys";
import { toast } from "sonner";

export default function SalesSettingsPage() {
  const { data } = useQuery({
    queryKey: salesQueryKeys.settings(),
    queryFn: () => salesApi.getSettings(),
  });

  const [formState, setFormState] = useState({
    defaultPaymentTerms: "",
    defaultCurrency: "EUR",
    quoteNumberPrefix: "Q-",
    quoteNextNumber: 1,
    orderNumberPrefix: "SO-",
    orderNextNumber: 1,
    invoiceNumberPrefix: "INV-",
    invoiceNextNumber: 1,
    defaultRevenueAccountId: "",
    defaultAccountsReceivableAccountId: "",
    defaultBankAccountId: "",
    autoPostOnIssue: true,
    autoPostOnPayment: true,
  });

  useEffect(() => {
    if (data?.settings) {
      setFormState({
        defaultPaymentTerms: data.settings.defaultPaymentTerms ?? "",
        defaultCurrency: data.settings.defaultCurrency,
        quoteNumberPrefix: data.settings.quoteNumberPrefix,
        quoteNextNumber: data.settings.quoteNextNumber,
        orderNumberPrefix: data.settings.orderNumberPrefix,
        orderNextNumber: data.settings.orderNextNumber,
        invoiceNumberPrefix: data.settings.invoiceNumberPrefix,
        invoiceNextNumber: data.settings.invoiceNextNumber,
        defaultRevenueAccountId: data.settings.defaultRevenueAccountId ?? "",
        defaultAccountsReceivableAccountId: data.settings.defaultAccountsReceivableAccountId ?? "",
        defaultBankAccountId: data.settings.defaultBankAccountId ?? "",
        autoPostOnIssue: data.settings.autoPostOnIssue,
        autoPostOnPayment: data.settings.autoPostOnPayment,
      });
    }
  }, [data]);

  const updateMutation = useMutation({
    mutationFn: () =>
      salesApi.updateSettings({
        patch: {
          defaultPaymentTerms: formState.defaultPaymentTerms || null,
          defaultCurrency: formState.defaultCurrency,
          quoteNumberPrefix: formState.quoteNumberPrefix,
          quoteNextNumber: Number(formState.quoteNextNumber),
          orderNumberPrefix: formState.orderNumberPrefix,
          orderNextNumber: Number(formState.orderNextNumber),
          invoiceNumberPrefix: formState.invoiceNumberPrefix,
          invoiceNextNumber: Number(formState.invoiceNextNumber),
          defaultRevenueAccountId: formState.defaultRevenueAccountId || null,
          defaultAccountsReceivableAccountId: formState.defaultAccountsReceivableAccountId || null,
          defaultBankAccountId: formState.defaultBankAccountId || null,
          autoPostOnIssue: formState.autoPostOnIssue,
          autoPostOnPayment: formState.autoPostOnPayment,
        },
      }),
    onSuccess: () => toast.success("Settings updated"),
    onError: () => toast.error("Failed to update settings"),
  });

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-h1 text-foreground">Sales Settings</h1>
        <p className="text-muted-foreground">Defaults and accounting mappings for sales.</p>
      </div>

      <Card>
        <CardContent className="p-6 space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Default Currency</Label>
              <Input
                value={formState.defaultCurrency}
                onChange={(e) =>
                  setFormState((prev) => ({ ...prev, defaultCurrency: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Default Payment Terms</Label>
              <Input
                value={formState.defaultPaymentTerms}
                onChange={(e) =>
                  setFormState((prev) => ({ ...prev, defaultPaymentTerms: e.target.value }))
                }
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Quote Prefix</Label>
              <Input
                value={formState.quoteNumberPrefix}
                onChange={(e) =>
                  setFormState((prev) => ({ ...prev, quoteNumberPrefix: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Quote Next #</Label>
              <Input
                type="number"
                value={formState.quoteNextNumber}
                onChange={(e) =>
                  setFormState((prev) => ({ ...prev, quoteNextNumber: Number(e.target.value) }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Order Prefix</Label>
              <Input
                value={formState.orderNumberPrefix}
                onChange={(e) =>
                  setFormState((prev) => ({ ...prev, orderNumberPrefix: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Order Next #</Label>
              <Input
                type="number"
                value={formState.orderNextNumber}
                onChange={(e) =>
                  setFormState((prev) => ({ ...prev, orderNextNumber: Number(e.target.value) }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Invoice Prefix</Label>
              <Input
                value={formState.invoiceNumberPrefix}
                onChange={(e) =>
                  setFormState((prev) => ({ ...prev, invoiceNumberPrefix: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Invoice Next #</Label>
              <Input
                type="number"
                value={formState.invoiceNextNumber}
                onChange={(e) =>
                  setFormState((prev) => ({ ...prev, invoiceNextNumber: Number(e.target.value) }))
                }
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Default Revenue Account</Label>
              <Input
                value={formState.defaultRevenueAccountId}
                onChange={(e) =>
                  setFormState((prev) => ({ ...prev, defaultRevenueAccountId: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Default AR Account</Label>
              <Input
                value={formState.defaultAccountsReceivableAccountId}
                onChange={(e) =>
                  setFormState((prev) => ({
                    ...prev,
                    defaultAccountsReceivableAccountId: e.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Default Bank Account</Label>
              <Input
                value={formState.defaultBankAccountId}
                onChange={(e) =>
                  setFormState((prev) => ({ ...prev, defaultBankAccountId: e.target.value }))
                }
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Auto-post on Issue</Label>
              <p className="text-sm text-muted-foreground">
                Create journal entries when invoices are issued.
              </p>
            </div>
            <Switch
              checked={formState.autoPostOnIssue}
              onCheckedChange={(checked) =>
                setFormState((prev) => ({ ...prev, autoPostOnIssue: checked }))
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Auto-post on Payment</Label>
              <p className="text-sm text-muted-foreground">
                Create journal entries when payments are recorded.
              </p>
            </div>
            <Switch
              checked={formState.autoPostOnPayment}
              onCheckedChange={(checked) =>
                setFormState((prev) => ({ ...prev, autoPostOnPayment: checked }))
              }
            />
          </div>

          <Button variant="accent" onClick={() => updateMutation.mutate()}>
            Save Settings
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
