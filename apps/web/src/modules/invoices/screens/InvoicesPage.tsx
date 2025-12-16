import React from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { FileText, Plus } from "lucide-react";
import { Card, CardContent } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { getInvoices, getClients } from "@/shared/mock/mockApi";
import { formatMoney, formatDate } from "@/shared/lib/formatters";
import { EmptyState } from "@/shared/components/EmptyState";
import type { InvoiceStatus } from "@/shared/types";

export default function InvoicesPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === "de" ? "de-DE" : "en-DE";

  const { data: invoices } = useQuery({ queryKey: ["invoices"], queryFn: () => getInvoices() });
  const { data: clients } = useQuery({ queryKey: ["clients"], queryFn: getClients });

  const getClientName = (clientId: string) =>
    clients?.find((c) => c.id === clientId)?.company || "Unknown";

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-h1 text-foreground">{t("invoices.title")}</h1>
        <Button variant="accent" data-testid="create-invoice-button">
          <Plus className="h-4 w-4" />
          {t("invoices.createInvoice")}
        </Button>
      </div>

      <Card>
        <CardContent className="p-0" data-testid="invoices-list">
          {invoices?.length === 0 ? (
            <EmptyState
              icon={FileText}
              title={t("invoices.noInvoices")}
              description={t("invoices.noInvoicesDescription")}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                      {t("invoices.invoiceNumber")}
                    </th>
                    <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                      {t("invoices.client")}
                    </th>
                    <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                      {t("invoices.date")}
                    </th>
                    <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                      {t("invoices.status")}
                    </th>
                    <th className="text-right text-sm font-medium text-muted-foreground px-4 py-3">
                      {t("invoices.amount")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {invoices?.map((invoice) => (
                    <tr
                      key={invoice.id}
                      data-testid={`invoice-row-${invoice.id}`}
                      className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-4 py-3 text-sm font-medium">{invoice.invoiceNumber}</td>
                      <td className="px-4 py-3 text-sm">{getClientName(invoice.clientId)}</td>
                      <td className="px-4 py-3 text-sm">{formatDate(invoice.issueDate, locale)}</td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={invoice.status as InvoiceStatus}
                          data-testid={`invoice-status-${invoice.status}`}
                        >
                          {t(`invoices.statuses.${invoice.status}`)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-medium">
                        {formatMoney(invoice.totalCents, locale)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
