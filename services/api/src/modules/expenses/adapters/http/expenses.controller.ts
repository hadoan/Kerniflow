import {
  Body,
  Controller,
  Post,
  UseInterceptors,
  Req,
  Param,
  Inject,
  Optional,
} from "@nestjs/common";
import {
  CreateExpenseUseCase,
  type CreateExpenseInput,
} from "../../application/use-cases/create-expense.usecase";
import { ArchiveExpenseUseCase } from "../../application/use-cases/archive-expense.usecase";
import { UnarchiveExpenseUseCase } from "../../application/use-cases/unarchive-expense.usecase";
import { IdempotencyInterceptor } from "../../../../shared/idempotency/IdempotencyInterceptor";
import { buildRequestContext } from "../../../../shared/context/request-context";
import type { Request } from "express";
import { z } from "zod";

const ExpenseHttpInputSchema = z.object({
  tenantId: z.string(),
  merchant: z.string(),
  totalCents: z.number(),
  currency: z.string(),
  category: z.string().optional(),
  issuedAt: z.string(),
  createdByUserId: z.string(),
  custom: z.record(z.any()).optional(),
});

@Controller("expenses")
@UseInterceptors(IdempotencyInterceptor)
export class ExpensesController {
  constructor(
    @Inject(CreateExpenseUseCase) private readonly createExpenseUseCase: CreateExpenseUseCase,
    @Inject(ArchiveExpenseUseCase) private readonly archiveExpenseUseCase: ArchiveExpenseUseCase,
    @Inject(UnarchiveExpenseUseCase)
    private readonly unarchiveExpenseUseCase: UnarchiveExpenseUseCase
  ) {}

  @Post()
  async create(@Body() body: unknown, @Req() req: Request) {
    const input = ExpenseHttpInputSchema.parse(body);
    const ctx = buildRequestContext({
      requestId: req.headers["x-request-id"] as string | undefined,
      tenantId: input.tenantId,
      actorUserId: input.createdByUserId,
    });
    const expenseInput: CreateExpenseInput = {
      tenantId: input.tenantId,
      merchant: input.merchant,
      totalCents: input.totalCents,
      currency: input.currency,
      category: input.category,
      createdByUserId: input.createdByUserId,
      custom: input.custom,
      issuedAt: new Date(input.issuedAt),
      idempotencyKey: (req.headers["x-idempotency-key"] as string) ?? "default",
      context: ctx,
    };
    const expense = await this.createExpenseUseCase.execute(expenseInput);
    const payload = {
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
    // Return both flat fields (for existing tests) and contract shape under "expense"
    return { ...payload, expense: payload };
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
