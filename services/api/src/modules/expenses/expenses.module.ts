import { Module } from "@nestjs/common";
import { OUTBOX_PORT, AUDIT_PORT } from "@kerniflow/kernel";
import {
  DataModule,
  CustomFieldDefinitionRepository,
  CustomFieldIndexRepository,
  PrismaAuditAdapter,
} from "@kerniflow/data";
import { ExpensesController } from "./adapters/http/expenses.controller";
import { PrismaIdempotencyStorageAdapter } from "../../shared/infrastructure/persistence/prisma-idempotency-storage.adapter";
import {
  IdempotencyStoragePort,
  IDEMPOTENCY_STORAGE_PORT_TOKEN,
} from "../../shared/ports/idempotency-storage.port";
import { IdGeneratorPort, ID_GENERATOR_TOKEN } from "../../shared/ports/id-generator.port";
import { ClockPort, CLOCK_PORT_TOKEN } from "../../shared/ports/clock.port";
import { SystemIdGenerator } from "../../shared/infrastructure/system-id-generator";
import { SystemClock } from "../../shared/infrastructure/system-clock";
import { EXPENSE_REPOSITORY } from "./application/ports/expense-repository.port";
import { ArchiveExpenseUseCase } from "./application/use-cases/archive-expense.usecase";
import { CreateExpenseUseCase } from "./application/use-cases/create-expense.usecase";
import { UnarchiveExpenseUseCase } from "./application/use-cases/unarchive-expense.usecase";
import { PrismaExpenseRepository } from "./infrastructure/adapters/prisma-expense-repository.adapter";
import { IdempotencyInterceptor } from "../../shared/infrastructure/idempotency/IdempotencyInterceptor";

@Module({
  imports: [DataModule],
  controllers: [ExpensesController],
  providers: [
    // Repository
    PrismaExpenseRepository,
    { provide: EXPENSE_REPOSITORY, useExisting: PrismaExpenseRepository },

    // Local infrastructure adapters
    SystemIdGenerator,
    SystemClock,
    PrismaAuditAdapter,
    PrismaIdempotencyStorageAdapter,
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

    // Token bindings for shared ports
    { provide: AUDIT_PORT, useExisting: PrismaAuditAdapter },
    { provide: IDEMPOTENCY_STORAGE_PORT_TOKEN, useExisting: PrismaIdempotencyStorageAdapter },
    { provide: ID_GENERATOR_TOKEN, useExisting: SystemIdGenerator },
    { provide: CLOCK_PORT_TOKEN, useExisting: SystemClock },
  ],
  exports: [CreateExpenseUseCase],
})
export class ExpensesModule {}
