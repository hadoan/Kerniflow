import { Injectable, NotFoundException } from "@nestjs/common";
import { ExpenseRepositoryPort } from "../ports/expense-repository.port";
import { ClockPort } from "../../../../shared/ports/clock.port";

export interface ArchiveExpenseInput {
  tenantId: string;
  expenseId: string;
  userId: string;
}

@Injectable()
export class ArchiveExpenseUseCase {
  constructor(
    private readonly repo: ExpenseRepositoryPort,
    private readonly clock: ClockPort
  ) {}

  async execute(input: ArchiveExpenseInput): Promise<void> {
    const expense = await this.repo.findById(input.tenantId, input.expenseId);
    if (!expense) {
      throw new NotFoundException("Expense not found");
    }
    if (expense.archivedAt) {
      return;
    }
    expense.archive(this.clock.now(), input.userId);
    await this.repo.save(expense);
  }
}
