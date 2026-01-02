import { type TransactionContext } from "@corely/kernel";
import { type Expense } from "../../domain/expense.entity";

export interface ExpenseRepositoryPort {
  save(expense: Expense, tx?: TransactionContext): Promise<void>;
  findById(tenantId: string, id: string, tx?: TransactionContext): Promise<Expense | null>;
  findByIdIncludingArchived(
    tenantId: string,
    id: string,
    tx?: TransactionContext
  ): Promise<Expense | null>;
  list(
    tenantId: string,
    params?: {
      includeArchived?: boolean;
    },
    tx?: TransactionContext
  ): Promise<Expense[]>;
  update(expense: Expense, tx?: TransactionContext): Promise<void>;
}

export const EXPENSE_REPOSITORY = "expenses/expense-repository";
