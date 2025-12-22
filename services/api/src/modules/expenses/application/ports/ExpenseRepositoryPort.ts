import { Expense } from "../../domain/entities/Expense";

export interface ExpenseRepositoryPort {
  save(expense: Expense): Promise<void>;
  findById(id: string): Promise<Expense | null>;
}
