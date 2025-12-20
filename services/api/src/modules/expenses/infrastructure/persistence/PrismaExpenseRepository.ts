import { Injectable } from "@nestjs/common";
import { prisma } from "@kerniflow/data";
import { Expense } from "../../domain/entities/Expense";
import { ExpenseRepositoryPort } from "../../application/ports/ExpenseRepositoryPort";

@Injectable()
export class PrismaExpenseRepository implements ExpenseRepositoryPort {
  async save(expense: Expense): Promise<void> {
    await prisma.expense.create({
      data: {
        id: expense.id,
        tenantId: expense.tenantId,
        merchant: expense.merchant,
        totalCents: expense.totalCents,
        currency: expense.currency,
        category: expense.category,
        issuedAt: expense.issuedAt,
        createdByUserId: expense.createdByUserId,
        custom: expense.custom as any,
      },
    });
  }

  async findById(id: string): Promise<Expense | null> {
    const data = await prisma.expense.findUnique({ where: { id } });
    if (!data) return null;
    return new Expense(
      data.id,
      data.tenantId,
      data.merchant,
      data.totalCents,
      data.currency,
      data.category,
      data.issuedAt,
      data.createdByUserId,
      data.createdAt,
      data.custom as any
    );
  }
}
