/**
 * Expenses API Client
 * Minimal wrapper around expenses endpoints
 */

import type { ExpenseDto, CreateExpenseWebInput } from "@corely/contracts";
import { apiClient } from "./api-client";

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

  async createExpense(input: CreateExpenseWebInput): Promise<ExpenseDto> {
    const result = await apiClient.post<{ expense: ExpenseDto }>("/expenses", input, {
      idempotencyKey: apiClient.generateIdempotencyKey(),
      correlationId: apiClient.generateCorrelationId(),
    });
    return result.expense;
  }
}

export const expensesApi = new ExpensesApi();
