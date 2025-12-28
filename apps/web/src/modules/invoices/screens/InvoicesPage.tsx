import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { FileText, MoreHorizontal, Plus } from "lucide-react";
import { Card, CardContent } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { invoicesApi } from "@/lib/invoices-api";
import { customersApi } from "@/lib/customers-api";
import { formatMoney, formatDate } from "@/shared/lib/formatters";
import { EmptyState } from "@/shared/components/EmptyState";
import type { InvoiceStatus } from "@/shared/types";

export default function InvoicesPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const locale = i18n.language === "de" ? "de-DE" : "en-DE";

  const { data: invoices } = useQuery({
    queryKey: ["invoices"],
    queryFn: () => invoicesApi.listInvoices(),
  });
  const { data: customersData } = useQuery({
    queryKey: ["customers"],
    queryFn: () => customersApi.listCustomers(),
  });
  const customers = customersData?.customers ?? [];

  const getCustomerName = (customerPartyId: string) =>
    customers.find((c) => c.id === customerPartyId)?.displayName || "Unknown";

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-h1 text-foreground">{t("invoices.title")}</h1>
        <Button
          variant="accent"
          data-testid="create-invoice-button"
          onClick={() => navigate("/invoices/new")}
        >
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
                      <td className="px-4 py-3 text-sm font-medium">{invoice.number || "Draft"}</td>
                      <td className="px-4 py-3 text-sm">
                        {getCustomerName(invoice.customerPartyId)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {formatDate(invoice.issuedAt || invoice.createdAt, locale)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={invoice.status.toLowerCase() as InvoiceStatus}
                          data-testid={`invoice-status-${invoice.status}`}
                        >
                          {t(`invoices.statuses.${invoice.status.toLowerCase()}`)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-medium">
                        {formatMoney(invoice.totals.totalCents, locale)}
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
