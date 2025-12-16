import { Body, Controller, Post, UseInterceptors } from '@nestjs/common';
import { CreateExpenseUseCase } from '../../application/use-cases/CreateExpenseUseCase';
import { ExpenseCreateInputSchema } from '@kerniflow/contracts';
import { IdempotencyInterceptor } from '../../../../shared/idempotency/IdempotencyInterceptor';

@Controller('expenses')
@UseInterceptors(IdempotencyInterceptor)
export class ExpensesController {
  constructor(private readonly createExpenseUseCase: CreateExpenseUseCase) {}

  @Post()
  async create(@Body() body: unknown) {
    const input = ExpenseCreateInputSchema.parse(body);
    const expense = await this.createExpenseUseCase.execute(input);
    return {
      id: expense.id,
      tenantId: expense.tenantId,
      amount: expense.amount,
      description: expense.description,
      createdAt: expense.createdAt.toISOString(),
    };
  }
}