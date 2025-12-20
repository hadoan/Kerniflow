import { Module } from "@nestjs/common";
import { InvoicesController } from "./presentation/http/invoices.controller";
import { PrismaInvoiceRepository } from "./infrastructure/persistence/PrismaInvoiceRepository";
import { CreateInvoiceDraftUseCase } from "./application/use-cases/create-invoice-draft/CreateInvoiceDraftUseCase";
import { IssueInvoiceUseCase } from "./application/use-cases/IssueInvoiceUseCase";
import { OutboxPort, OUTBOX_PORT_TOKEN } from "../../shared/ports/outbox.port";
import { AuditPort, AUDIT_PORT_TOKEN } from "../../shared/ports/audit.port";
import { IdempotencyPort, IDEMPOTENCY_PORT_TOKEN } from "../../shared/ports/idempotency.port";
import { IdGeneratorPort, ID_GENERATOR_TOKEN } from "../../shared/ports/id-generator.port";
import { ClockPort, CLOCK_PORT_TOKEN } from "../../shared/ports/clock.port";
import { PrismaOutboxAdapter } from "../../shared/infrastructure/persistence/prisma-outbox.adapter";
import { PrismaAuditAdapter } from "../../shared/infrastructure/persistence/prisma-audit.adapter";
import { PrismaIdempotencyAdapter } from "../../shared/infrastructure/persistence/prisma-idempotency.adapter";
import { SystemIdGenerator } from "../../shared/infrastructure/system-id-generator";
import { SystemClock } from "../../shared/infrastructure/system-clock";
import { CustomFieldDefinitionRepository, CustomFieldIndexRepository } from "@kerniflow/data";
import { NestLoggerAdapter } from "../../shared/adapters/logger/nest-logger.adapter";
import { PrismaUnitOfWorkAdapter } from "../../shared/adapters/uow/prisma-uow.adapter";
import { DbIdempotencyAdapter } from "../../shared/adapters/idempotency/db-idempotency.adapter";
import { SystemIdGeneratorAdapter } from "../../shared/adapters/id-generator/system-id-generator.adapter";
import { prisma } from "@kerniflow/data";

@Module({
  controllers: [InvoicesController],
  providers: [
    PrismaInvoiceRepository,
    CustomFieldDefinitionRepository,
    CustomFieldIndexRepository,
    PrismaOutboxAdapter,
    PrismaAuditAdapter,
    PrismaIdempotencyAdapter,
    SystemIdGenerator,
    SystemClock,
    {
      provide: CreateInvoiceDraftUseCase,
      useFactory: (
        repo: PrismaInvoiceRepository,
        outbox: OutboxPort,
        audit: AuditPort,
        customDefs: CustomFieldDefinitionRepository,
        customIndexes: CustomFieldIndexRepository
      ) =>
        new CreateInvoiceDraftUseCase({
          logger: new NestLoggerAdapter(),
          uow: new PrismaUnitOfWorkAdapter(prisma),
          idempotency: new DbIdempotencyAdapter(prisma, "invoices.create_draft"),
          invoiceRepo: repo,
          outbox,
          audit,
          idGenerator: new SystemIdGeneratorAdapter(),
          customFieldDefinitions: customDefs,
          customFieldIndexes: customIndexes,
        }),
      inject: [
        PrismaInvoiceRepository,
        OUTBOX_PORT_TOKEN,
        AUDIT_PORT_TOKEN,
        CustomFieldDefinitionRepository,
        CustomFieldIndexRepository,
      ],
    },
    {
      provide: IssueInvoiceUseCase,
      useFactory: (
        repo: PrismaInvoiceRepository,
        outbox: OutboxPort,
        audit: AuditPort,
        idempotency: IdempotencyPort,
        clock: ClockPort
      ) => new IssueInvoiceUseCase(repo, outbox, audit, idempotency, clock),
      inject: [
        PrismaInvoiceRepository,
        OUTBOX_PORT_TOKEN,
        AUDIT_PORT_TOKEN,
        IDEMPOTENCY_PORT_TOKEN,
        CLOCK_PORT_TOKEN,
      ],
    },
    { provide: OUTBOX_PORT_TOKEN, useClass: PrismaOutboxAdapter },
    { provide: AUDIT_PORT_TOKEN, useClass: PrismaAuditAdapter },
    { provide: IDEMPOTENCY_PORT_TOKEN, useClass: PrismaIdempotencyAdapter },
    { provide: ID_GENERATOR_TOKEN, useExisting: SystemIdGenerator },
    { provide: CLOCK_PORT_TOKEN, useExisting: SystemClock },
  ],
  exports: [CreateInvoiceDraftUseCase, IssueInvoiceUseCase],
})
export class InvoicesModule {}
