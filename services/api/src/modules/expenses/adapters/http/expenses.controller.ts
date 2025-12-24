import { Body, Controller, Post, UseInterceptors, Req, Param } from "@nestjs/common";
import { CreateExpenseUseCase } from "../../application/use-cases/create-expense.usecase";
import { ArchiveExpenseUseCase } from "../../application/use-cases/archive-expense.usecase";
import { UnarchiveExpenseUseCase } from "../../application/use-cases/unarchive-expense.usecase";
import { CreateExpenseInputSchema } from "@kerniflow/contracts";
import { IdempotencyInterceptor } from "../../../../shared/idempotency/IdempotencyInterceptor";
import { buildRequestContext } from "../../../../shared/context/request-context";
import { Request } from "express";

@Controller("expenses")
@UseInterceptors(IdempotencyInterceptor)
export class ExpensesController {
  constructor(
    private readonly createExpenseUseCase: CreateExpenseUseCase,
    private readonly archiveExpenseUseCase: ArchiveExpenseUseCase,
    private readonly unarchiveExpenseUseCase: UnarchiveExpenseUseCase
  ) {}

  @Post()
  async create(@Body() body: unknown, @Req() req: Request) {
    const input = CreateExpenseInputSchema.parse(body);
    const ctx = buildRequestContext({
      requestId: req.headers["x-request-id"] as string | undefined,
      tenantId: input.tenantId,
      actorUserId: input.createdByUserId,
    });
    const expense = await this.createExpenseUseCase.execute({
      ...input,
      issuedAt: new Date(input.issuedAt),
      idempotencyKey: (req.headers["x-idempotency-key"] as string) ?? "default",
      context: ctx,
    });
    return {
      id: expense.id,
      tenantId: expense.tenantId,
      merchant: expense.merchant,
      totalCents: expense.totalCents,
      currency: expense.currency,
      category: expense.category,
      issuedAt: expense.issuedAt.toISOString(),
      createdByUserId: expense.createdByUserId,
      archivedAt: expense.archivedAt?.toISOString(),
      archivedByUserId: expense.archivedByUserId ?? undefined,
      custom: expense.custom ?? undefined,
    };
  }

  @Post(":expenseId/archive")
  async archive(@Param("expenseId") expenseId: string, @Req() req: Request) {
    const ctx = buildRequestContext({
      requestId: req.headers["x-request-id"] as string | undefined,
      tenantId: (req.headers["x-tenant-id"] as string | undefined) ?? (req.body as any)?.tenantId,
      actorUserId: (req as any).user?.id,
    });
    await this.archiveExpenseUseCase.execute({
      tenantId: ctx.tenantId!,
      expenseId,
      userId: ctx.actorUserId ?? "system",
    });
    return { archived: true };
  }

  @Post(":expenseId/unarchive")
  async unarchive(@Param("expenseId") expenseId: string, @Req() req: Request) {
    const ctx = buildRequestContext({
      requestId: req.headers["x-request-id"] as string | undefined,
      tenantId: (req.headers["x-tenant-id"] as string | undefined) ?? (req.body as any)?.tenantId,
      actorUserId: (req as any).user?.id,
    });
    await this.unarchiveExpenseUseCase.execute({
      tenantId: ctx.tenantId!,
      expenseId,
    });
    return { archived: false };
  }
}
