import { Module } from "@nestjs/common";
import { CopilotController } from "./adapters/http/copilot.controller";

import { StreamCopilotChatUseCase } from "./application/use-cases/stream-copilot-chat.usecase";
import { PrismaAgentRunRepository } from "./infrastructure/persistence/prisma.agent-run.repo";
import { PrismaMessageRepository } from "./infrastructure/persistence/prisma.message.repo";
import { PrismaToolExecutionRepository } from "./infrastructure/persistence/prisma.tool-execution.repo";
import { ToolRegistry } from "./infrastructure/tools/tool-registry";
import { AiSdkModelAdapter } from "./infrastructure/model/ai-sdk.model-adapter";
import { PrismaAuditAdapter } from "./infrastructure/audit/prisma.audit.adapter";
import { PrismaOutboxAdapter } from "./infrastructure/outbox/prisma.outbox.adapter";
import { InMemoryIdempotencyAdapter } from "./infrastructure/idempotency/in-memory-idempotency.adapter";
import { TenantGuard } from "./adapters/http/guards/tenant.guard";
import { COPILOT_TOOLS } from "./application/ports/tool-registry.port";
import { AuditPort } from "./application/ports/audit.port";
import { OutboxPort } from "./application/ports/outbox.port";
import { ClockPort } from "@kerniflow/kernel/ports/clock.port";
import { IdentityModule } from "../identity/identity.module";
import { NestLoggerAdapter } from "../../shared/adapters/logger/nest-logger.adapter";
import { InvoicesModule } from "../invoices/invoices.module";
import { InvoicesApplication } from "../invoices/application/invoices.application";
import { buildInvoiceTools } from "../invoices/adapters/tools/invoice.tools";
import { PartyCrmModule } from "../party-crm";
import { PartyCrmApplication } from "../party-crm/application/party-crm.application";
import { buildCustomerTools } from "../party-crm/adapters/tools/customer.tools";

@Module({
  imports: [IdentityModule, InvoicesModule, PartyCrmModule],
  controllers: [CopilotController],
  providers: [
    PrismaAgentRunRepository,
    PrismaMessageRepository,
    PrismaToolExecutionRepository,
    ToolRegistry,
    PrismaAuditAdapter,
    PrismaOutboxAdapter,
    InMemoryIdempotencyAdapter,
    TenantGuard,
    { provide: "COPILOT_LOGGER", useClass: NestLoggerAdapter },
    {
      provide: AiSdkModelAdapter,
      useFactory: (
        toolExec: PrismaToolExecutionRepository,
        audit: PrismaAuditAdapter,
        outbox: PrismaOutboxAdapter,
        logger: NestLoggerAdapter
      ) => {
        logger.debug("Creating AiSdkModelAdapter");
        return new AiSdkModelAdapter(toolExec, audit, outbox);
      },
      inject: [
        PrismaToolExecutionRepository,
        PrismaAuditAdapter,
        PrismaOutboxAdapter,
        "COPILOT_LOGGER",
      ],
    },
    {
      provide: "COPILOT_CLOCK",
      useValue: { now: () => new Date() },
    },
    {
      provide: COPILOT_TOOLS,
      useFactory: (invoices: InvoicesApplication, partyCrm: PartyCrmApplication) => [
        ...buildInvoiceTools(invoices),
        ...buildCustomerTools(partyCrm),
      ],
      inject: [InvoicesApplication, PartyCrmApplication],
    },
    {
      provide: StreamCopilotChatUseCase,
      useFactory: (
        runs: PrismaAgentRunRepository,
        messages: PrismaMessageRepository,
        toolExec: PrismaToolExecutionRepository,
        tools: ToolRegistry,
        model: AiSdkModelAdapter,
        audit: PrismaAuditAdapter,
        outbox: PrismaOutboxAdapter,
        idem: InMemoryIdempotencyAdapter,
        clock: ClockPort,
        logger: NestLoggerAdapter
      ) => {
        logger.debug("Creating StreamCopilotChatUseCase");
        return new StreamCopilotChatUseCase(
          runs,
          messages,
          toolExec,
          tools,
          model,
          audit as AuditPort,
          outbox as OutboxPort,
          idem,
          clock
        );
      },
      inject: [
        PrismaAgentRunRepository,
        PrismaMessageRepository,
        PrismaToolExecutionRepository,
        ToolRegistry,
        AiSdkModelAdapter,
        PrismaAuditAdapter,
        PrismaOutboxAdapter,
        InMemoryIdempotencyAdapter,
        "COPILOT_CLOCK",
        "COPILOT_LOGGER",
      ],
    },
  ],
  exports: [],
})
export class AiCopilotModule {}
