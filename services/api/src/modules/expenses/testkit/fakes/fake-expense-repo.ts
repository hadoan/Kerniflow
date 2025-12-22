import { ExpenseRepositoryPort } from "../../application/ports/ExpenseRepositoryPort";
import { Expense } from "../../domain/entities/Expense";

export class FakeExpenseRepository implements ExpenseRepositoryPort {
  public expenses: Expense[] = [];

  async save(expense: Expense): Promise<void> {
    const existingIndex = this.expenses.findIndex((e) => e.id === expense.id);
    if (existingIndex >= 0) {
      this.expenses[existingIndex] = expense;
    } else {
      this.expenses.push(expense);
    }
  }

  async findById(tenantId: string, id: string): Promise<Expense | null> {
    return (
      this.expenses.find((e) => e.id === id && e.tenantId === tenantId && !e.archivedAt) ?? null
    );
  }

  async findByIdIncludingArchived(tenantId: string, id: string): Promise<Expense | null> {
    return this.expenses.find((e) => e.id === id && e.tenantId === tenantId) ?? null;
  }

  async list(tenantId: string, params?: { includeArchived?: boolean }): Promise<Expense[]> {
    return this.expenses.filter(
      (e) => e.tenantId === tenantId && (params?.includeArchived ? true : !e.archivedAt)
    );
  }
}
