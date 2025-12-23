import { TransactionContext } from "@kerniflow/kernel";
import { Expense } from "../../domain/entities/Expense";

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
}

export const EXPENSE_REPOSITORY = Symbol("EXPENSE_REPOSITORY");
