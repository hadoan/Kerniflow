import { Injectable } from '@nestjs/common';
import { prisma } from '@kerniflow/data';
import { Expense } from '../../domain/entities/Expense';
import { ExpenseRepositoryPort } from '../../application/ports/ExpenseRepositoryPort';

@Injectable()
export class PrismaExpenseRepository implements ExpenseRepositoryPort {
  async save(expense: Expense): Promise<void> {
    await prisma.expense.create({
      data: {
        id: expense.id,
        tenantId: expense.tenantId,
        amount: expense.amount,
        description: expense.description,
      },
    });
  }

  async findById(id: string): Promise<Expense | null> {
    const data = await prisma.expense.findUnique({ where: { id } });
    if (!data) return null;
    return new Expense(data.id, data.tenantId, data.amount, data.description, data.createdAt);
  }
}