import React from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  TrendingUp,
  Clock,
  Receipt,
  ArrowUpRight,
  MessageSquare,
  FileText,
  Sparkles,
  Users,
  ShoppingCart,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { formatMoney, formatRelativeTime } from "@/shared/lib/formatters";
import { CardSkeleton } from "@/shared/components/Skeleton";
import { invoicesApi } from "@/lib/invoices-api";
import { customersApi } from "@/lib/customers-api";
import { expensesApi } from "@/lib/expenses-api";
import { useMenu } from "@/modules/platform/hooks/useMenu";

export default function DashboardPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === "de" ? "de-DE" : "en-DE";

  // Server-driven UI configuration from menu API
  const { data: menu } = useMenu("web");
  const capabilities = menu?.workspace?.capabilities ?? {
    multiUser: false,
    quotes: false,
    aiCopilot: false,
    rbac: false,
  };
  const terminology = menu?.workspace?.terminology ?? {
    partyLabel: "Client",
    partyLabelPlural: "Clients",
  };

  // Fetch invoices
  const { data: invoices = [], isLoading: isLoadingInvoices } = useQuery({
    queryKey: ["invoices"],
    queryFn: () => invoicesApi.listInvoices(),
  });

  // Fetch customers
  const { data: customersData, isLoading: isLoadingCustomers } = useQuery({
    queryKey: ["customers"],
    queryFn: () => customersApi.listCustomers(),
  });

  // Fetch expenses
  const { data: expenses = [], isLoading: isLoadingExpenses } = useQuery({
    queryKey: ["expenses"],
    queryFn: () => expensesApi.listExpenses(),
  });

  const customers = customersData?.customers || [];
  const isLoading = isLoadingInvoices || isLoadingCustomers || isLoadingExpenses;

  // Calculate dashboard metrics
  const dashboard = React.useMemo(() => {
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    // Revenue this month (paid invoices)
    const revenueThisMonthCents = invoices
      .filter((inv) => {
        const paidAt = inv.payments?.[0]?.paidAt;
        if (!paidAt || inv.status !== "PAID") {
          return false;
        }
        const paidDate = new Date(paidAt);
        return paidDate >= thisMonth && paidDate < nextMonth;
      })
      .reduce((sum, inv) => sum + (inv.totals?.totalCents || 0), 0);

    // Outstanding invoices (issued/sent but not paid)
    const outstandingInvoices = invoices.filter(
      (inv) => inv.status === "ISSUED" || inv.status === "SENT"
    );
    const outstandingInvoicesCents = outstandingInvoices.reduce(
      (sum, inv) => sum + (inv.totals?.totalCents || 0),
      0
    );

    // Expenses this month
    const expensesThisMonthCents = expenses
      .filter((exp) => {
        const expDate = new Date(exp.expenseDate || exp.createdAt);
        return expDate >= thisMonth && expDate < nextMonth;
      })
      .reduce((sum, exp) => sum + (exp.totalAmountCents || 0), 0);

    // Recent invoices (last 4)
    const recentInvoices = [...invoices]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 4);

    // Recent expenses (last 4)
    const recentExpenses = [...expenses]
      .sort((a, b) => {
        const dateA = new Date(a.expenseDate || a.createdAt).getTime();
        const dateB = new Date(b.expenseDate || b.createdAt).getTime();
        return dateB - dateA;
      })
      .slice(0, 4);

    return {
      revenueThisMonthCents,
      outstandingInvoicesCents,
      outstandingInvoicesCount: outstandingInvoices.length,
      expensesThisMonthCents,
      recentInvoices,
      recentExpenses,
    };
  }, [invoices, expenses]);

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-h1 text-foreground">{t("dashboard.welcome")}</h1>
          <p className="text-muted-foreground mt-1">{t("common.tagline")}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="accent" asChild>
            <Link to="/assistant">
              <Sparkles className="h-4 w-4" />
              {t("dashboard.openAssistant")}
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Revenue */}
        <Card variant="elevated" className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-success/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("dashboard.revenueThisMonth")}
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {formatMoney(dashboard.revenueThisMonthCents, locale)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">+12% from last month</p>
          </CardContent>
        </Card>

        {/* Outstanding Invoices */}
        <Card variant="elevated" className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-warning/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("dashboard.outstandingInvoices")}
            </CardTitle>
            <Clock className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {formatMoney(dashboard.outstandingInvoicesCents, locale)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {dashboard.outstandingInvoicesCount} invoices pending
            </p>
          </CardContent>
        </Card>

        {/* Expenses */}
        <Card variant="elevated" className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-accent/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("dashboard.expensesThisMonth")}
            </CardTitle>
            <Receipt className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {formatMoney(dashboard.expensesThisMonthCents, locale)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {dashboard.recentExpenses.length} expenses this month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions - Capability-driven UI */}
      <div>
        <h2 className="text-h3 text-foreground mb-4">{t("dashboard.quickActions")}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Always show: Add expense with AI */}
          {capabilities.aiCopilot && (
            <Link to="/assistant">
              <Card variant="interactive" className="group">
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 transition-colors">
                    <Receipt className="h-6 w-6 text-accent" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-foreground">{t("dashboard.addExpense")}</div>
                    <div className="text-sm text-muted-foreground">Upload receipt with AI</div>
                  </div>
                  <ArrowUpRight className="h-5 w-5 text-muted-foreground group-hover:text-accent transition-colors" />
                </CardContent>
              </Card>
            </Link>
          )}

          {/* Always show: Create invoice */}
          <Link to="/invoices">
            <Card variant="interactive" className="group">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-success/10 flex items-center justify-center group-hover:bg-success/20 transition-colors">
                  <FileText className="h-6 w-6 text-success" />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-foreground">{t("dashboard.createInvoice")}</div>
                  <div className="text-sm text-muted-foreground">
                    {capabilities.aiCopilot ? "Generate with AI" : "Create new"}
                  </div>
                </div>
                <ArrowUpRight className="h-5 w-5 text-muted-foreground group-hover:text-success transition-colors" />
              </CardContent>
            </Card>
          </Link>

          {/* Conditional: Show quotes for company mode, assistant for freelancer */}
          {capabilities.quotes ? (
            <Link to="/quotes">
              <Card variant="interactive" className="group">
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-warning/10 flex items-center justify-center group-hover:bg-warning/20 transition-colors">
                    <ShoppingCart className="h-6 w-6 text-warning" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-foreground">Create Quote</div>
                    <div className="text-sm text-muted-foreground">
                      For {terminology.partyLabel.toLowerCase()}
                    </div>
                  </div>
                  <ArrowUpRight className="h-5 w-5 text-muted-foreground group-hover:text-warning transition-colors" />
                </CardContent>
              </Card>
            </Link>
          ) : (
            capabilities.aiCopilot && (
              <Link to="/assistant">
                <Card variant="interactive" className="group">
                  <CardContent className="p-6 flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <MessageSquare className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-foreground">
                        {t("dashboard.openAssistant")}
                      </div>
                      <div className="text-sm text-muted-foreground">Ask anything</div>
                    </div>
                    <ArrowUpRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </CardContent>
                </Card>
              </Link>
            )
          )}

          {/* Conditional: Team management for multi-user companies */}
          {capabilities.multiUser && (
            <Link to="/settings/team">
              <Card variant="interactive" className="group">
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-info/10 flex items-center justify-center group-hover:bg-info/20 transition-colors">
                    <Users className="h-6 w-6 text-info" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-foreground">Manage Team</div>
                    <div className="text-sm text-muted-foreground">Invite members</div>
                  </div>
                  <ArrowUpRight className="h-5 w-5 text-muted-foreground group-hover:text-info transition-colors" />
                </CardContent>
              </Card>
            </Link>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Invoices */}
        <Card variant="default">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">{t("invoices.title")}</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/invoices">{t("common.viewAll")}</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dashboard.recentInvoices.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No invoices yet</p>
              ) : (
                dashboard.recentInvoices.map((invoice) => {
                  const customer = customers.find((c) => c.id === invoice.customerPartyId);
                  return (
                    <Link
                      key={invoice.id}
                      to={`/invoices/${invoice.id}`}
                      className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-foreground">
                            {invoice.number || "Draft"}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {customer?.displayName || "Unknown Customer"}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-foreground">
                          {formatMoney(invoice.totals?.totalCents || 0, locale)}
                        </div>
                        <Badge variant={invoice.status.toLowerCase() as any} className="text-xs">
                          {invoice.status}
                        </Badge>
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Expenses */}
        <Card variant="default">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">{t("expenses.title")}</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/expenses">{t("common.viewAll")}</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dashboard.recentExpenses.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No expenses yet</p>
              ) : (
                dashboard.recentExpenses.map((expense) => (
                  <Link
                    key={expense.id}
                    to={`/expenses`}
                    className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center">
                        <Receipt className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-foreground">
                          {expense.merchantName || "Unknown Merchant"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {expense.category || "Uncategorized"}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-foreground">
                        {formatMoney(expense.totalAmountCents || 0, locale)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatRelativeTime(expense.expenseDate || expense.createdAt, locale)}
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
