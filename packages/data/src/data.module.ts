import { Global, Module } from "@nestjs/common";
import { UNIT_OF_WORK, OUTBOX_PORT, AUDIT_PORT, IDEMPOTENCY_PORT } from "@kerniflow/kernel";
import { PrismaService } from "./prisma/prisma.service";
import { PrismaUnitOfWork } from "./uow/prisma-unit-of-work.adapter";
import { PrismaOutboxAdapter } from "./adapters/prisma-outbox.adapter";
import { PrismaAuditAdapter } from "./adapters/prisma-audit.adapter";
import { PrismaIdempotencyAdapter } from "./adapters/prisma-idempotency.adapter";
import { OutboxRepository } from "./adapters/prisma-outbox-repository.adapter";
import { CustomFieldDefinitionRepository } from "./adapters/prisma-custom-field-definition-repository.adapter";
import { CustomFieldIndexRepository } from "./adapters/prisma-custom-field-index-repository.adapter";
import { WorkflowDefinitionRepository } from "./adapters/prisma-workflow-definition-repository.adapter";
import { WorkflowInstanceRepository } from "./adapters/prisma-workflow-instance-repository.adapter";
import { WorkflowTaskRepository } from "./adapters/prisma-workflow-task-repository.adapter";
import { WorkflowEventRepository } from "./adapters/prisma-workflow-event-repository.adapter";

/**
 * Global DataModule that provides all data access infrastructure.
 *
 * This module:
 * - Manages PrismaService lifecycle (singleton)
 * - Exports UnitOfWork for transactional operations
 * - Exports common infrastructure ports (Outbox, Audit, Idempotency)
 * - Exports shared repositories (CustomFields, etc.)
 *
 * Import this module in AppModule or feature modules that need data access.
 */
@Global()
@Module({
  providers: [
    // Prisma singleton
    PrismaService,

    // Unit of Work
    PrismaUnitOfWork,
    { provide: UNIT_OF_WORK, useExisting: PrismaUnitOfWork },

    // Infrastructure ports
    PrismaOutboxAdapter,
    { provide: OUTBOX_PORT, useExisting: PrismaOutboxAdapter },

    PrismaAuditAdapter,
    { provide: AUDIT_PORT, useExisting: PrismaAuditAdapter },

    PrismaIdempotencyAdapter,
    { provide: IDEMPOTENCY_PORT, useExisting: PrismaIdempotencyAdapter },

    // Repositories
    OutboxRepository,
    CustomFieldDefinitionRepository,
    CustomFieldIndexRepository,
    WorkflowDefinitionRepository,
    WorkflowInstanceRepository,
    WorkflowTaskRepository,
    WorkflowEventRepository,
  ],
  exports: [
    // Prisma client (for rare cases where direct access is needed)
    PrismaService,

    // Unit of Work token
    UNIT_OF_WORK,

    // Infrastructure port tokens
    OUTBOX_PORT,
    AUDIT_PORT,
    IDEMPOTENCY_PORT,

    // Concrete implementations (for DI by class)
    PrismaIdempotencyAdapter,
    OutboxRepository,
    CustomFieldDefinitionRepository,
    CustomFieldIndexRepository,
    WorkflowDefinitionRepository,
    WorkflowInstanceRepository,
    WorkflowTaskRepository,
    WorkflowEventRepository,
  ],
})
export class DataModule {}
