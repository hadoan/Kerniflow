import React from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Receipt, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { formatMoney, formatDate } from "@/shared/lib/formatters";
import { EmptyState } from "@/shared/components/EmptyState";
import { expensesApi } from "@/lib/expenses-api";
import type { ExpenseDto } from "@kerniflow/contracts";

export default function ExpensesPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === "de" ? "de-DE" : "en-DE";
  const navigate = useNavigate();

  const { data: expenses, isLoading } = useQuery<ExpenseDto[]>({
    queryKey: ["expenses"],
    queryFn: () => expensesApi.listExpenses(),
  });

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-h1 text-foreground">{t("expenses.title")}</h1>
        <Button
          variant="accent"
          data-testid="create-expense-button"
          onClick={() => navigate("/expenses/new")}
        >
          <Plus className="h-4 w-4" />
          {t("expenses.addExpense")}
        </Button>
      </div>

      <Card>
        <CardContent className="p-0" data-testid="expenses-list">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">{t("common.loading")}</div>
          ) : expenses?.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title={t("expenses.noExpenses")}
              description={t("expenses.noExpensesDescription")}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                      {t("expenses.date")}
                    </th>
                    <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                      {t("expenses.merchant")}
                    </th>
                    <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                      {t("expenses.category")}
                    </th>
                    <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                      {t("expenses.vat")}
                    </th>
                    <th className="text-right text-sm font-medium text-muted-foreground px-4 py-3">
                      {t("expenses.amount")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {expenses?.map((expense) => (
                    <tr
                      key={expense.id}
                      data-testid={`expense-row-${expense.id}`}
                      className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-4 py-3 text-sm">
                        {formatDate(expense.expenseDate || expense.createdAt, locale)}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium">
                        {expense.merchantName || "-"}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="muted">
                          {expense.category ? t(`expenses.categories.${expense.category}`) : "-"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {expense.taxAmountCents != null && expense.totalAmountCents
                          ? `${Math.round(
                              ((expense.taxAmountCents ?? 0) / expense.totalAmountCents) * 100
                            )}%`
                          : "-"}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-medium">
                        {formatMoney(
                          expense.totalAmountCents ?? (expense as any).totalCents ?? 0,
                          locale
                        )}
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
