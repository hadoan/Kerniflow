import { Injectable } from "@nestjs/common";
import type { TransactionContext } from "@corely/kernel";
import { PrismaService, getPrismaClient } from "@corely/data";
import { ExpenseRepositoryPort } from "../../application/ports/expense-repository.port";
import { Expense } from "../../domain/expense.entity";

@Injectable()
export class PrismaExpenseRepository implements ExpenseRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async save(expense: Expense, tx?: TransactionContext): Promise<void> {
    const client = getPrismaClient(this.prisma, tx as any);
    await client.expense.create({
      data: {
        id: expense.id,
        tenantId: expense.tenantId,
        merchantName: expense.merchant,
        expenseDate: expense.issuedAt,
        totalAmountCents: expense.totalCents,
        taxAmountCents: expense.taxAmountCents ?? undefined,
        currency: expense.currency,
        category: expense.category,
        archivedAt: expense.archivedAt ?? undefined,
        archivedByUserId: expense.archivedByUserId ?? undefined,
        custom: expense.custom as any,
      } as any,
    });
  }

  async findById(tenantId: string, id: string, tx?: TransactionContext): Promise<Expense | null> {
    const client = getPrismaClient(this.prisma, tx as any);
    const data = await client.expense.findFirst({ where: { id, tenantId, archivedAt: null } });
    return data ? this.mapExpense(data) : null;
  }

  async update(expense: Expense, tx?: TransactionContext): Promise<void> {
    const client = getPrismaClient(this.prisma, tx as any);
    await client.expense.update({
      where: { id: expense.id },
      data: {
        merchantName: expense.merchant,
        expenseDate: expense.issuedAt,
        totalAmountCents: expense.totalCents,
        taxAmountCents: expense.taxAmountCents ?? undefined,
        currency: expense.currency,
        category: expense.category,
        archivedAt: expense.archivedAt ?? undefined,
        archivedByUserId: expense.archivedByUserId ?? undefined,
        custom: expense.custom as any,
      },
    });
  }

  async findByIdIncludingArchived(
    tenantId: string,
    id: string,
    tx?: TransactionContext
  ): Promise<Expense | null> {
    const client = getPrismaClient(this.prisma, tx as any);
    const data = await client.expense.findFirst({ where: { id, tenantId } });
    return data ? this.mapExpense(data) : null;
  }

  async list(
    tenantId: string,
    params?: { includeArchived?: boolean },
    tx?: TransactionContext
  ): Promise<Expense[]> {
    const client = getPrismaClient(this.prisma, tx as any);
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
      data.taxAmountCents ?? null,
      data.currency,
      data.category,
      new Date(data.expenseDate),
      data.createdByUserId ?? "",
      new Date(data.createdAt),
      data.archivedAt ? new Date(data.archivedAt) : null,
      data.archivedByUserId ?? null,
      data.custom as any
    );
  }
}
