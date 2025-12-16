import React from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Receipt, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getExpenses } from '@/shared/mock/mockApi';
import { formatMoney, formatDate } from '@/shared/lib/formatters';
import { EmptyState } from '@/shared/components/EmptyState';

export default function ExpensesPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'de' ? 'de-DE' : 'en-DE';

  const { data: expenses, isLoading } = useQuery({
    queryKey: ['expenses'],
    queryFn: () => getExpenses(),
  });

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-h1 text-foreground">{t('expenses.title')}</h1>
        <Button variant="accent">
          <Plus className="h-4 w-4" />
          {t('expenses.addExpense')}
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {expenses?.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title={t('expenses.noExpenses')}
              description={t('expenses.noExpensesDescription')}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">{t('expenses.date')}</th>
                    <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">{t('expenses.merchant')}</th>
                    <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">{t('expenses.category')}</th>
                    <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">{t('expenses.vat')}</th>
                    <th className="text-right text-sm font-medium text-muted-foreground px-4 py-3">{t('expenses.amount')}</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses?.map((expense) => (
                    <tr key={expense.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 text-sm">{formatDate(expense.date, locale)}</td>
                      <td className="px-4 py-3 text-sm font-medium">{expense.merchant}</td>
                      <td className="px-4 py-3">
                        <Badge variant="muted">{t(`expenses.categories.${expense.category}`)}</Badge>
                      </td>
                      <td className="px-4 py-3 text-sm">{expense.vatRate}%</td>
                      <td className="px-4 py-3 text-sm text-right font-medium">{formatMoney(expense.amountCents, locale)}</td>
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
