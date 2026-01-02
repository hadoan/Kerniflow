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

  async getExpense(id: string): Promise<ExpenseDto> {
    const result = await apiClient.get<{ expense: ExpenseDto }>(`/expenses/${id}`, {
      correlationId: apiClient.generateCorrelationId(),
    });
    return result.expense;
  }

  async updateExpense(id: string, input: CreateExpenseWebInput): Promise<ExpenseDto> {
    const result = await apiClient.patch<{ expense: ExpenseDto }>(`/expenses/${id}`, input, {
      correlationId: apiClient.generateCorrelationId(),
    });
    return result.expense;
  }

  async archiveExpense(id: string): Promise<void> {
    await apiClient.post(
      `/expenses/${id}/archive`,
      {},
      { correlationId: apiClient.generateCorrelationId() }
    );
  }
}

export const expensesApi = new ExpensesApi();
