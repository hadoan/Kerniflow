import { Module } from "@nestjs/common";
import { OUTBOX_PORT, AUDIT_PORT } from "@corely/kernel";
import {
  DataModule,
  CustomFieldDefinitionRepository,
  CustomFieldIndexRepository,
} from "@corely/data";
import { ExpensesController } from "./adapters/http/expenses.controller";
import {
  IdempotencyStoragePort,
  IDEMPOTENCY_STORAGE_PORT_TOKEN,
} from "../../shared/ports/idempotency-storage.port";
import { IdGeneratorPort, ID_GENERATOR_TOKEN } from "../../shared/ports/id-generator.port";
import { ClockPort, CLOCK_PORT_TOKEN } from "../../shared/ports/clock.port";
import { EXPENSE_REPOSITORY } from "./application/ports/expense-repository.port";
import { ArchiveExpenseUseCase } from "./application/use-cases/archive-expense.usecase";
import { CreateExpenseUseCase } from "./application/use-cases/create-expense.usecase";
import { UnarchiveExpenseUseCase } from "./application/use-cases/unarchive-expense.usecase";
import { PrismaExpenseRepository } from "./infrastructure/adapters/prisma-expense-repository.adapter";
import { IdempotencyInterceptor } from "../../shared/infrastructure/idempotency/IdempotencyInterceptor";
import { KernelModule } from "../../shared/kernel/kernel.module";

@Module({
  imports: [DataModule, KernelModule],
  controllers: [ExpensesController],
  providers: [
    // Repository
    PrismaExpenseRepository,
    { provide: EXPENSE_REPOSITORY, useExisting: PrismaExpenseRepository },

    IdempotencyInterceptor,

    // Use Cases
    {
      provide: CreateExpenseUseCase,
      useFactory: (
        repo: PrismaExpenseRepository,
        outbox,
        audit,
        idempotency: IdempotencyStoragePort,
        idGen: IdGeneratorPort,
        clock: ClockPort,
        customDefs: CustomFieldDefinitionRepository,
        customIndexes: CustomFieldIndexRepository
      ) =>
        new CreateExpenseUseCase(
          repo,
          outbox,
          audit,
          idempotency,
          idGen,
          clock,
          customDefs,
          customIndexes
        ),
      inject: [
        EXPENSE_REPOSITORY,
        OUTBOX_PORT,
        AUDIT_PORT,
        IDEMPOTENCY_STORAGE_PORT_TOKEN,
        ID_GENERATOR_TOKEN,
        CLOCK_PORT_TOKEN,
        CustomFieldDefinitionRepository,
        CustomFieldIndexRepository,
      ],
    },
    {
      provide: ArchiveExpenseUseCase,
      useFactory: (repo: PrismaExpenseRepository, clock: ClockPort) =>
        new ArchiveExpenseUseCase(repo, clock),
      inject: [EXPENSE_REPOSITORY, CLOCK_PORT_TOKEN],
    },
    {
      provide: UnarchiveExpenseUseCase,
      useFactory: (repo: PrismaExpenseRepository) => new UnarchiveExpenseUseCase(repo),
      inject: [EXPENSE_REPOSITORY],
    },
  ],
  exports: [CreateExpenseUseCase],
})
export class ExpensesModule {}
