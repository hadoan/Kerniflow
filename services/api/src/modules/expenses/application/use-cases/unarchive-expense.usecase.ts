import { Injectable, NotFoundException } from "@nestjs/common";
import { ExpenseRepositoryPort } from "../ports/expense-repository.port";

export interface UnarchiveExpenseInput {
  tenantId: string;
  expenseId: string;
}

@Injectable()
export class UnarchiveExpenseUseCase {
  constructor(private readonly repo: ExpenseRepositoryPort) {}

  async execute(input: UnarchiveExpenseInput): Promise<void> {
    const expense = await this.repo.findByIdIncludingArchived(input.tenantId, input.expenseId);
    if (!expense) {
      throw new NotFoundException("Expense not found");
    }
    if (!expense.archivedAt) {
      return;
    }
    expense.unarchive();
    await this.repo.save(expense);
  }
}
