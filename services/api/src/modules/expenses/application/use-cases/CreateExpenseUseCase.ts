import { Inject, Injectable } from '@nestjs/common';
import { Expense } from '../../domain/entities/Expense';
import { ExpenseCreated } from '../../domain/events/ExpenseCreated';
import { ExpenseRepositoryPort } from '../ports/ExpenseRepositoryPort';
import { OutboxRepository } from '@kerniflow/data';
import { EVENT_NAMES } from '@kerniflow/contracts';

export const EXPENSE_REPO = Symbol('EXPENSE_REPO');

@Injectable()
export class CreateExpenseUseCase {
  constructor(
    @Inject(EXPENSE_REPO) private readonly expenseRepo: ExpenseRepositoryPort,
    private readonly outboxRepo: OutboxRepository,
  ) {}

  async execute(input: { tenantId: string; amount: number; description: string }): Promise<Expense> {
    const expense = new Expense(
      crypto.randomUUID(),
      input.tenantId,
      input.amount,
      input.description,
      new Date(),
    );

    await this.expenseRepo.save(expense);

    // Enqueue outbox event (in real app, use transaction)
    await this.outboxRepo.enqueue({
      eventType: EVENT_NAMES.EXPENSE_CREATED,
      payloadJson: JSON.stringify({
        expenseId: expense.id,
        tenantId: expense.tenantId,
        amount: expense.amount,
        description: expense.description,
      }),
      tenantId: expense.tenantId,
    });

    return expense;
  }
}