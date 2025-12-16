import { Module } from '@nestjs/common';
import { ExpensesController } from './presentation/http/expenses.controller';
import { CreateExpenseUseCase } from './application/use-cases/CreateExpenseUseCase';
import { PrismaExpenseRepository } from './infrastructure/persistence/PrismaExpenseRepository';
import { EXPENSE_REPO } from './application/use-cases/CreateExpenseUseCase';
import { OutboxRepository } from '@kerniflow/data';

@Module({
  controllers: [ExpensesController],
  providers: [
    CreateExpenseUseCase,
    OutboxRepository,
    {
      provide: EXPENSE_REPO,
      useClass: PrismaExpenseRepository,
    },
  ],
  exports: [CreateExpenseUseCase],
})
export class ExpensesModule {}