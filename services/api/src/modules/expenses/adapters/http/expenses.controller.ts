import {
  Body,
  Controller,
  Get,
  Post,
  UseInterceptors,
  Req,
  Param,
  Inject,
  Optional,
  Query,
  BadRequestException,
} from "@nestjs/common";
import {
  CreateExpenseUseCase,
  type CreateExpenseInput,
} from "../../application/use-cases/create-expense.usecase";
import { ArchiveExpenseUseCase } from "../../application/use-cases/archive-expense.usecase";
import { UnarchiveExpenseUseCase } from "../../application/use-cases/unarchive-expense.usecase";
import { IdempotencyInterceptor } from "../../../../shared/infrastructure/idempotency/IdempotencyInterceptor";
import { buildRequestContext } from "../../../../shared/context/request-context";
import type { Request } from "express";
import { z } from "zod";
import { CreateExpenseWebInputSchema } from "@corely/contracts";
import {
  EXPENSE_REPOSITORY,
  type ExpenseRepositoryPort,
} from "../../application/ports/expense-repository.port";
import type { Expense } from "../../domain/expense.entity";

const ExpenseHttpInputSchema = CreateExpenseWebInputSchema.partial().extend({
  tenantId: z.string().optional(),
  merchant: z.string().optional(),
  totalCents: z.number().optional(),
  issuedAt: z.string().optional(),
  createdByUserId: z.string().optional(),
});

@Controller("expenses")
@UseInterceptors(IdempotencyInterceptor)
export class ExpensesController {
  constructor(
    @Inject(CreateExpenseUseCase) private readonly createExpenseUseCase: CreateExpenseUseCase,
    @Inject(ArchiveExpenseUseCase) private readonly archiveExpenseUseCase: ArchiveExpenseUseCase,
    @Inject(UnarchiveExpenseUseCase)
    private readonly unarchiveExpenseUseCase: UnarchiveExpenseUseCase,
    @Inject(EXPENSE_REPOSITORY) private readonly expenseRepo: ExpenseRepositoryPort
  ) {}

  @Post()
  async create(@Body() body: unknown, @Req() req: Request) {
    const input = ExpenseHttpInputSchema.parse(body);

    const tenantId =
      input.tenantId ??
      (req.headers["x-tenant-id"] as string | undefined) ??
      (req.headers["x-workspace-id"] as string | undefined) ??
      (req as any).tenantId;
    if (!tenantId) {
      throw new BadRequestException("Missing tenant/workspace id");
    }

    const merchant = input.merchant ?? input.merchantName;
    if (!merchant) {
      throw new BadRequestException("Missing merchant");
    }

    const totalCents = input.totalCents ?? input.totalAmountCents;
    if (typeof totalCents !== "number") {
      throw new BadRequestException("Missing total amount");
    }

    const currency = input.currency;
    if (!currency) {
      throw new BadRequestException("Missing currency");
    }

    const issuedAtStr = input.issuedAt ?? input.expenseDate ?? new Date().toISOString();
    const issuedAt = new Date(issuedAtStr);
    if (Number.isNaN(issuedAt.getTime())) {
      throw new BadRequestException("Invalid date");
    }

    const actorUserId =
      input.createdByUserId ??
      (req as any).user?.userId ??
      (req as any).user?.id ??
      (req.headers["x-user-id"] as string | undefined);
    const createdByUserId = actorUserId ?? "system";

    const ctx = buildRequestContext({
      requestId: req.headers["x-request-id"] as string | undefined,
      tenantId,
      actorUserId: createdByUserId,
    });
    const expenseInput: CreateExpenseInput = {
      tenantId,
      merchant,
      totalCents,
      currency,
      category: input.category,
      createdByUserId,
      custom: input.custom,
      issuedAt,
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

  @Get()
  async list(@Query() query: any, @Req() req: Request) {
    const tenantId =
      (req.headers["x-tenant-id"] as string | undefined) ??
      (req.headers["x-workspace-id"] as string | undefined) ??
      (req as any).tenantId;

    if (!tenantId) {
      return { items: [] };
    }

    const includeArchived = query?.includeArchived === "true" || query?.includeArchived === true;
    const expenses = await this.expenseRepo.list(tenantId, { includeArchived });
    return { items: expenses.map((expense) => this.mapExpenseDto(expense)) };
  }

  private mapExpenseDto(expense: Expense) {
    return {
      id: expense.id,
      tenantId: expense.tenantId,
      status: "SUBMITTED",
      expenseDate: expense.issuedAt.toISOString().slice(0, 10),
      merchantName: expense.merchant,
      supplierPartyId: null,
      currency: expense.currency,
      notes: null,
      category: expense.category,
      totalAmountCents: expense.totalCents,
      taxAmountCents: null,
      archivedAt: expense.archivedAt?.toISOString() ?? null,
      createdAt: expense.createdAt.toISOString(),
      updatedAt: expense.createdAt.toISOString(),
      lines: [],
      receipts: [],
      custom: expense.custom,
    };
  }
}
