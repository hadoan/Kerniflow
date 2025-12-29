import { Module } from "@nestjs/common";
import { DataModule } from "@kerniflow/data";
import { CopilotController } from "./adapters/http/copilot.controller";
import type { EnvService } from "@kerniflow/config";

import { StreamCopilotChatUseCase } from "./application/use-cases/stream-copilot-chat.usecase";
import { PrismaAgentRunRepository } from "./infrastructure/adapters/prisma-agent-run-repository.adapter";
import { PrismaMessageRepository } from "./infrastructure/adapters/prisma-message-repository.adapter";
import { PrismaToolExecutionRepository } from "./infrastructure/adapters/prisma-tool-execution-repository.adapter";
import { ToolRegistry } from "./infrastructure/tools/tool-registry";
import { AiSdkModelAdapter } from "./infrastructure/model/ai-sdk.model-adapter";
import { PrismaAuditAdapter } from "./infrastructure/audit/prisma.audit.adapter";
import { PrismaOutboxAdapter } from "./infrastructure/outbox/prisma.outbox.adapter";
import { PrismaCopilotIdempotencyAdapter } from "./infrastructure/idempotency/prisma-idempotency-copilot.adapter";
import { TenantGuard } from "./adapters/http/guards/tenant.guard";
import { COPILOT_TOOLS } from "./application/ports/tool-registry.port";
import { AuditPort } from "./application/ports/audit.port";
import { OutboxPort } from "./application/ports/outbox.port";
import { ClockPort } from "@kerniflow/kernel/ports/clock.port";
import { IdentityModule } from "../identity/identity.module";
import { NestLoggerAdapter } from "../../shared/adapters/logger/nest-logger.adapter";
import { IdempotencyService } from "../../shared/idempotency/idempotency.service";
import { InvoicesModule } from "../invoices/invoices.module";
import { InvoicesApplication } from "../invoices/application/invoices.application";
import { buildInvoiceTools } from "../invoices/adapters/tools/invoice.tools";
import { PartyCrmModule } from "../party-crm";
import { PartyCrmApplication } from "../party-crm/application/party-crm.application";
import { buildCustomerTools } from "../party-crm/adapters/tools/customer.tools";
import { SalesModule } from "../sales";
import { SalesApplication } from "../sales/application/sales.application";
import { buildSalesTools } from "../sales/adapters/tools/sales.tools";
import { PurchasingModule } from "../purchasing";
import { PurchasingApplication } from "../purchasing/application/purchasing.application";
import { buildPurchasingTools } from "../purchasing/adapters/tools/purchasing.tools";

@Module({
  imports: [
    DataModule,
    IdentityModule,
    InvoicesModule,
    PartyCrmModule,
    SalesModule,
    PurchasingModule,
  ],
  controllers: [CopilotController],
  providers: [
    PrismaAgentRunRepository,
    PrismaMessageRepository,
    PrismaToolExecutionRepository,
    ToolRegistry,
    PrismaAuditAdapter,
    PrismaOutboxAdapter,
    IdempotencyService,
    PrismaCopilotIdempotencyAdapter,
    TenantGuard,
    { provide: "COPILOT_LOGGER", useClass: NestLoggerAdapter },
    {
      provide: AiSdkModelAdapter,
      useFactory: (
        toolExec: PrismaToolExecutionRepository,
        audit: PrismaAuditAdapter,
        outbox: PrismaOutboxAdapter,
        env: EnvService,
        logger: NestLoggerAdapter
      ) => {
        logger.debug("Creating AiSdkModelAdapter");
        return new AiSdkModelAdapter(toolExec, audit, outbox, env);
      },
      inject: [
        PrismaToolExecutionRepository,
        PrismaAuditAdapter,
        PrismaOutboxAdapter,
        "ENV_SERVICE",
        "COPILOT_LOGGER",
      ],
    },
    {
      provide: "COPILOT_CLOCK",
      useValue: { now: () => new Date() },
    },
    {
      provide: COPILOT_TOOLS,
      useFactory: (
        invoices: InvoicesApplication,
        partyCrm: PartyCrmApplication,
        sales: SalesApplication,
        purchasing: PurchasingApplication
      ) => [
        ...buildInvoiceTools(invoices),
        ...buildCustomerTools(partyCrm),
        ...buildSalesTools(sales),
        ...buildPurchasingTools(purchasing),
      ],
      inject: [InvoicesApplication, PartyCrmApplication, SalesApplication, PurchasingApplication],
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
        idem: PrismaCopilotIdempotencyAdapter,
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
        PrismaCopilotIdempotencyAdapter,
        "COPILOT_CLOCK",
        "COPILOT_LOGGER",
      ],
    },
  ],
  exports: [],
})
export class AiCopilotModule {}
