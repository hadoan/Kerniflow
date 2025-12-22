import { Expense } from "../../domain/entities/Expense";

export interface ExpenseRepositoryPort {
  save(expense: Expense): Promise<void>;
  findById(tenantId: string, id: string): Promise<Expense | null>;
  findByIdIncludingArchived(tenantId: string, id: string): Promise<Expense | null>;
  list(
    tenantId: string,
    params?: {
      includeArchived?: boolean;
    }
  ): Promise<Expense[]>;
}
