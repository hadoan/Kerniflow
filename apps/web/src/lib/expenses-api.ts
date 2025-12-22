/**
 * Expenses API Client
 * Minimal wrapper around expenses endpoints
 */

import type { ExpenseDto } from "@kerniflow/contracts";
import { apiClient } from "./api-client";

export type CreateExpenseRequest = {
  expenseDate: string; // YYYY-MM-DD
  merchantName: string;
  totalAmountCents: number;
  totalCents?: number;
  currency: string;
  category?: string;
  notes?: string;
  vatRate?: number;
};

export class ExpensesApi {
  async listExpenses(): Promise<ExpenseDto[]> {
    const result = await apiClient.get<{ items?: ExpenseDto[]; expenses?: ExpenseDto[] }>(
      "/expenses",
      {
        correlationId: apiClient.generateCorrelationId(),
      }
    );
    return result.items ?? result.expenses ?? [];
  }

  async createExpense(input: CreateExpenseRequest): Promise<ExpenseDto> {
    const result = await apiClient.post<{ expense: ExpenseDto }>("/expenses", input, {
      idempotencyKey: apiClient.generateIdempotencyKey(),
      correlationId: apiClient.generateCorrelationId(),
    });
    return result.expense;
  }
}

export const expensesApi = new ExpensesApi();
