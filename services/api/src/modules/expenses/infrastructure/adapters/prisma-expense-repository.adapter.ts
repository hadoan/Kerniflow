import { Injectable } from "@nestjs/common";
import { PrismaService, getPrismaClient } from "@kerniflow/data";
import { TransactionContext } from "@kerniflow/kernel";
import { Expense } from "../../domain/entities/Expense";
import { ExpenseRepositoryPort } from "../../application/ports/ExpenseRepositoryPort";

@Injectable()
export class PrismaExpenseRepository implements ExpenseRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async save(expense: Expense, tx?: TransactionContext): Promise<void> {
    const client = getPrismaClient(this.prisma, tx);
    await client.expense.create({
      data: {
        id: expense.id,
        tenantId: expense.tenantId,
        merchantName: expense.merchant,
        expenseDate: expense.issuedAt,
        totalAmountCents: expense.totalCents,
        currency: expense.currency,
        category: expense.category,
        archivedAt: expense.archivedAt ?? undefined,
        archivedByUserId: expense.archivedByUserId ?? undefined,
        custom: expense.custom as any,
      } as any,
    });
  }

  async findById(tenantId: string, id: string, tx?: TransactionContext): Promise<Expense | null> {
    const client = getPrismaClient(this.prisma, tx);
    const data = await client.expense.findFirst({ where: { id, tenantId, archivedAt: null } });
    return data ? this.mapExpense(data) : null;
  }

  async findByIdIncludingArchived(
    tenantId: string,
    id: string,
    tx?: TransactionContext
  ): Promise<Expense | null> {
    const client = getPrismaClient(this.prisma, tx);
    const data = await client.expense.findFirst({ where: { id, tenantId } });
    return data ? this.mapExpense(data) : null;
  }

  async list(
    tenantId: string,
    params?: { includeArchived?: boolean },
    tx?: TransactionContext
  ): Promise<Expense[]> {
    const client = getPrismaClient(this.prisma, tx);
    const data = await client.expense.findMany({
      where: { tenantId, archivedAt: params?.includeArchived ? undefined : null },
      orderBy: { expenseDate: "desc" },
    });
    return data.map((row) => this.mapExpense(row));
  }

  private mapExpense(data: any): Expense {
    return new Expense(
      data.id,
      data.tenantId,
      data.merchantName ?? "",
      data.totalAmountCents,
      data.currency,
      data.category,
      data.expenseDate,
      data.createdByUserId ?? "",
      data.createdAt,
      data.archivedAt ?? null,
      data.archivedByUserId ?? null,
      data.custom as any
    );
  }
}
