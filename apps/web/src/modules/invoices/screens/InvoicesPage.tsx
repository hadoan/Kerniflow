import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Download, Edit, FileText, Mail, MoreHorizontal, Plus, Trash2 } from "lucide-react";
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
import { toast } from "sonner";

export default function InvoicesPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const locale = i18n.language === "de" ? "de-DE" : "en-DE";
  const queryClient = useQueryClient();

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

  const duplicateInvoice = useMutation({
    mutationFn: async (invoiceId: string) => {
      const invoice = await invoicesApi.getInvoice(invoiceId);
      return invoicesApi.createInvoice({
        customerPartyId: invoice.customerPartyId,
        currency: invoice.currency,
        invoiceDate: invoice.invoiceDate ?? undefined,
        dueDate: invoice.dueDate ?? undefined,
        notes: invoice.notes ?? undefined,
        terms: invoice.terms ?? undefined,
        lineItems: invoice.lineItems.map((item) => ({
          description: item.description,
          qty: item.qty,
          unitPriceCents: item.unitPriceCents,
        })),
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Invoice duplicated");
    },
    onError: (error) => {
      console.error("Duplicate invoice failed", error);
      toast.error("Failed to duplicate invoice");
    },
  });

  const emailInvoice = useMutation({
    mutationFn: (invoiceId: string) => invoicesApi.sendInvoice(invoiceId),
    onSuccess: () => toast.success("Invoice email sent"),
    onError: (error) => {
      console.error("Send invoice failed", error);
      toast.error("Failed to send invoice");
    },
  });

  const cancelInvoice = useMutation({
    mutationFn: (invoiceId: string) => invoicesApi.cancelInvoice(invoiceId, "Soft delete"),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Invoice deleted (soft)");
    },
    onError: (error) => {
      console.error("Delete invoice failed", error);
      toast.error("Failed to delete invoice");
    },
  });

  const handleDownload = async (invoiceId: string) => {
    try {
      const invoice = await invoicesApi.getInvoice(invoiceId);
      const pdfUrl = (invoice as any).pdfUrl;
      if (pdfUrl) {
        window.open(pdfUrl, "_blank", "noopener");
        return;
      }
      toast.info("Download", { description: "PDF not available for this invoice yet." });
    } catch (error) {
      console.error("Download invoice failed", error);
      toast.error("Failed to download invoice");
    }
  };

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
                    <th className="w-12"></th>
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
                      <td className="px-2 py-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => navigate(`/invoices/${invoice.id}`)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => duplicateInvoice.mutate(invoice.id)}>
                              <Copy className="mr-2 h-4 w-4" />
                              Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => emailInvoice.mutate(invoice.id)}>
                              <Mail className="mr-2 h-4 w-4" />
                              Email
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDownload(invoice.id)}>
                              <Download className="mr-2 h-4 w-4" />
                              Download
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => cancelInvoice.mutate(invoice.id)}>
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
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
