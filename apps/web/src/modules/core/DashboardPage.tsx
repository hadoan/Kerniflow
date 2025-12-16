import React from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { 
  TrendingUp, 
  Clock, 
  Receipt, 
  ArrowUpRight, 
  Plus,
  MessageSquare,
  FileText,
  Sparkles
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getDashboard } from '@/shared/mock/mockApi';
import { formatMoney, formatRelativeTime } from '@/shared/lib/formatters';
import { CardSkeleton } from '@/shared/components/Skeleton';
import { getDb } from '@/shared/mock/mockDb';

export default function DashboardPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'de' ? 'de-DE' : 'en-DE';
  const db = getDb();

  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: getDashboard,
  });

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
          <h1 className="text-h1 text-foreground">
            {t('dashboard.welcome')}, {db.user.name.split(' ')[0]}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t('common.tagline')}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="accent" asChild>
            <Link to="/assistant">
              <Sparkles className="h-4 w-4" />
              {t('dashboard.openAssistant')}
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
              {t('dashboard.revenueThisMonth')}
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {formatMoney(dashboard?.revenueThisMonthCents || 0, locale)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              +12% from last month
            </p>
          </CardContent>
        </Card>

        {/* Outstanding Invoices */}
        <Card variant="elevated" className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-warning/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('dashboard.outstandingInvoices')}
            </CardTitle>
            <Clock className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {formatMoney(dashboard?.outstandingInvoicesCents || 0, locale)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {dashboard?.outstandingInvoicesCount || 0} invoices pending
            </p>
          </CardContent>
        </Card>

        {/* Expenses */}
        <Card variant="elevated" className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-accent/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('dashboard.expensesThisMonth')}
            </CardTitle>
            <Receipt className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {formatMoney(dashboard?.expensesThisMonthCents || 0, locale)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {dashboard?.recentExpenses?.length || 0} expenses this month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-h3 text-foreground mb-4">{t('dashboard.quickActions')}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link to="/assistant">
            <Card variant="interactive" className="group">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 transition-colors">
                  <Receipt className="h-6 w-6 text-accent" />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-foreground">{t('dashboard.addExpense')}</div>
                  <div className="text-sm text-muted-foreground">Upload receipt with AI</div>
                </div>
                <ArrowUpRight className="h-5 w-5 text-muted-foreground group-hover:text-accent transition-colors" />
              </CardContent>
            </Card>
          </Link>

          <Link to="/invoices">
            <Card variant="interactive" className="group">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-success/10 flex items-center justify-center group-hover:bg-success/20 transition-colors">
                  <FileText className="h-6 w-6 text-success" />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-foreground">{t('dashboard.createInvoice')}</div>
                  <div className="text-sm text-muted-foreground">Generate with AI</div>
                </div>
                <ArrowUpRight className="h-5 w-5 text-muted-foreground group-hover:text-success transition-colors" />
              </CardContent>
            </Card>
          </Link>

          <Link to="/assistant">
            <Card variant="interactive" className="group">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <MessageSquare className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-foreground">{t('dashboard.openAssistant')}</div>
                  <div className="text-sm text-muted-foreground">Ask anything</div>
                </div>
                <ArrowUpRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Invoices */}
        <Card variant="default">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">{t('invoices.title')}</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/invoices">{t('common.viewAll')}</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dashboard?.recentInvoices?.slice(0, 4).map((invoice) => (
                <Link
                  key={invoice.id}
                  to={`/invoices`}
                  className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-foreground">
                        {invoice.invoiceNumber}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {db.clients.find(c => c.id === invoice.clientId)?.company || 'Client'}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-foreground">
                      {formatMoney(invoice.totalCents, locale)}
                    </div>
                    <Badge variant={invoice.status as any} className="text-xs">
                      {t(`invoices.statuses.${invoice.status}`)}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Expenses */}
        <Card variant="default">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">{t('expenses.title')}</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/expenses">{t('common.viewAll')}</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dashboard?.recentExpenses?.slice(0, 4).map((expense) => (
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
                        {expense.merchant}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {t(`expenses.categories.${expense.category}`)}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-foreground">
                      {formatMoney(expense.amountCents, locale)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatRelativeTime(expense.date, locale)}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
