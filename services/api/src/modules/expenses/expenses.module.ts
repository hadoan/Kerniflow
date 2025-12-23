import { Module } from "@nestjs/common";
import { OUTBOX_PORT, AUDIT_PORT } from "@kerniflow/kernel";
import {
  DataModule,
  CustomFieldDefinitionRepository,
  CustomFieldIndexRepository,
  PrismaIdempotencyAdapter,
} from "@kerniflow/data";
import { ExpensesController } from "./adapters/http/expenses.controller";
import { CreateExpenseUseCase } from "./application/use-cases/CreateExpenseUseCase";
import { ArchiveExpenseUseCase } from "./application/use-cases/ArchiveExpenseUseCase";
import { UnarchiveExpenseUseCase } from "./application/use-cases/UnarchiveExpenseUseCase";
import { PrismaExpenseRepository } from "./infrastructure/persistence/PrismaExpenseRepository";
import { EXPENSE_REPOSITORY } from "./application/ports/ExpenseRepositoryPort";
import { IdempotencyPort, IDEMPOTENCY_PORT_TOKEN } from "../../shared/ports/idempotency.port";
import { IdGeneratorPort, ID_GENERATOR_TOKEN } from "../../shared/ports/id-generator.port";
import { ClockPort, CLOCK_PORT_TOKEN } from "../../shared/ports/clock.port";
import { SystemIdGenerator } from "../../shared/infrastructure/system-id-generator";
import { SystemClock } from "../../shared/infrastructure/system-clock";
import { PrismaOutboxAdapter } from "./infrastructure/outbox/prisma-outbox.adapter";
import { PrismaAuditAdapter } from "./infrastructure/audit/prisma-audit.adapter";

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
    PrismaOutboxAdapter,
    PrismaAuditAdapter,

    // Use Cases
    {
      provide: CreateExpenseUseCase,
      useFactory: (
        repo: PrismaExpenseRepository,
        outbox,
        audit,
        idempotency: IdempotencyPort,
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
        IDEMPOTENCY_PORT_TOKEN,
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
    { provide: OUTBOX_PORT, useExisting: PrismaOutboxAdapter },
    { provide: AUDIT_PORT, useExisting: PrismaAuditAdapter },
    { provide: IDEMPOTENCY_PORT_TOKEN, useExisting: PrismaIdempotencyAdapter },
    { provide: ID_GENERATOR_TOKEN, useExisting: SystemIdGenerator },
    { provide: CLOCK_PORT_TOKEN, useExisting: SystemClock },
  ],
  exports: [CreateExpenseUseCase],
})
export class ExpensesModule {}
