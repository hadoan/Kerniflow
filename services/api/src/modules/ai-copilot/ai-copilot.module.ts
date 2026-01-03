import { Module } from "@nestjs/common";
import { DataModule } from "@corely/data";
import { CopilotController } from "./adapters/http/copilot.controller";
import { EnvService } from "@corely/config";

import { StreamCopilotChatUseCase } from "./application/use-cases/stream-copilot-chat.usecase";
import { PrismaAgentRunRepository } from "./infrastructure/adapters/prisma-agent-run-repository.adapter";
import { PrismaMessageRepository } from "./infrastructure/adapters/prisma-message-repository.adapter";
import { PrismaToolExecutionRepository } from "./infrastructure/adapters/prisma-tool-execution-repository.adapter";
import { ToolRegistry } from "./infrastructure/tools/tool-registry";
import { AiSdkModelAdapter } from "./infrastructure/model/ai-sdk.model-adapter";
import { PrismaAuditAdapter } from "./infrastructure/audit/prisma.audit.adapter";
import { PrismaCopilotIdempotencyAdapter } from "./infrastructure/idempotency/prisma-idempotency-copilot.adapter";
import { TenantGuard } from "./adapters/http/guards/tenant.guard";
import { COPILOT_TOOLS } from "./application/ports/tool-registry.port";
import { AuditPort } from "./application/ports/audit.port";
import { OUTBOX_PORT } from "./application/ports/outbox.port";
import type { OutboxPort } from "./application/ports/outbox.port";
import { ClockPort } from "@corely/kernel/ports/clock.port";
import { IdentityModule } from "../identity/identity.module";
import { NestLoggerAdapter } from "../../shared/adapters/logger/nest-logger.adapter";
import { IdempotencyService } from "../../shared/infrastructure/idempotency/idempotency.service";
import { InvoicesModule } from "../invoices/invoices.module";
import { InvoicesApplication } from "../invoices/application/invoices.application";
import { buildInvoiceTools } from "../invoices/adapters/tools/invoice.tools";
import { PartyModule } from "../party";
import { PartyApplication } from "../party/application/party.application";
import { buildCustomerTools } from "../party/adapters/tools/customer.tools";
import { SalesModule } from "../sales";
import { SalesApplication } from "../sales/application/sales.application";
import { buildSalesTools } from "../sales/adapters/tools/sales.tools";
import { PurchasingModule } from "../purchasing";
import { PurchasingApplication } from "../purchasing/application/purchasing.application";
import { buildPurchasingTools } from "../purchasing/adapters/tools/purchasing.tools";
import { InventoryModule } from "../inventory";
import { InventoryApplication } from "../inventory/application/inventory.application";
import { buildInventoryTools } from "../inventory/adapters/tools/inventory.tools";
import { buildApprovalTools } from "../approvals/adapters/tools/approval.tools";
import { EngagementModule } from "../engagement/engagement.module";
import { EngagementApplication } from "../engagement/application/engagement.application";
import { buildEngagementTools } from "../engagement/adapters/tools/engagement.tools";
import { OtelObservabilityAdapter } from "../../shared/observability/otel-observability.adapter";
import { type ObservabilityPort } from "@corely/kernel";
import { CreateRunUseCase } from "./application/use-cases/create-run.usecase";
import { GetRunUseCase } from "./application/use-cases/get-run.usecase";
import { ListMessagesUseCase } from "./application/use-cases/list-messages.usecase";

@Module({
  imports: [
    DataModule,
    IdentityModule,
    InvoicesModule,
    PartyModule,
    SalesModule,
    PurchasingModule,
    InventoryModule,
    EngagementModule,
  ],
  controllers: [CopilotController],
  providers: [
    PrismaAgentRunRepository,
    PrismaMessageRepository,
    PrismaToolExecutionRepository,
    ToolRegistry,
    PrismaAuditAdapter,
    IdempotencyService,
    PrismaCopilotIdempotencyAdapter,
    TenantGuard,
    { provide: "COPILOT_LOGGER", useClass: NestLoggerAdapter },
    {
      provide: AiSdkModelAdapter,
      useFactory: (
        toolExec: PrismaToolExecutionRepository,
        audit: PrismaAuditAdapter,
        outbox: OutboxPort,
        env: EnvService,
        logger: NestLoggerAdapter,
        observability: ObservabilityPort
      ) => {
        logger.debug("Creating AiSdkModelAdapter");
        return new AiSdkModelAdapter(toolExec, audit, outbox, env, observability);
      },
      inject: [
        PrismaToolExecutionRepository,
        PrismaAuditAdapter,
        OUTBOX_PORT,
        EnvService,
        "COPILOT_LOGGER",
        "OBSERVABILITY_PORT",
      ],
    },
    {
      provide: "COPILOT_CLOCK",
      useValue: { now: () => new Date() },
    },
    {
      provide: CreateRunUseCase,
      useFactory: (runs: PrismaAgentRunRepository) => new CreateRunUseCase(runs),
      inject: [PrismaAgentRunRepository],
    },
    {
      provide: GetRunUseCase,
      useFactory: (runs: PrismaAgentRunRepository) => new GetRunUseCase(runs),
      inject: [PrismaAgentRunRepository],
    },
    {
      provide: ListMessagesUseCase,
      useFactory: (messages: PrismaMessageRepository) => new ListMessagesUseCase(messages),
      inject: [PrismaMessageRepository],
    },
    {
      provide: "OBSERVABILITY_PORT",
      useFactory: (env: EnvService) =>
        new OtelObservabilityAdapter({ maskingMode: env.OBSERVABILITY_MASKING_MODE }),
      inject: [EnvService],
    },
    {
      provide: COPILOT_TOOLS,
      useFactory: (
        invoices: InvoicesApplication,
        partyCrm: PartyApplication,
        sales: SalesApplication,
        purchasing: PurchasingApplication,
        inventory: InventoryApplication,
        engagement: EngagementApplication,
        env: EnvService
      ) => [
        ...buildInvoiceTools(invoices),
        ...buildCustomerTools(partyCrm),
        ...buildSalesTools(sales),
        ...buildPurchasingTools(purchasing, env),
        ...buildInventoryTools(inventory, env),
        ...buildApprovalTools(env),
        ...buildEngagementTools(engagement, partyCrm),
      ],
      inject: [
        InvoicesApplication,
        PartyApplication,
        SalesApplication,
        PurchasingApplication,
        InventoryApplication,
        EngagementApplication,
        EnvService,
      ],
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
        outbox: OutboxPort,
        idem: PrismaCopilotIdempotencyAdapter,
        clock: ClockPort,
        logger: NestLoggerAdapter,
        observability: ObservabilityPort
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
          clock,
          observability
        );
      },
      inject: [
        PrismaAgentRunRepository,
        PrismaMessageRepository,
        PrismaToolExecutionRepository,
        ToolRegistry,
        AiSdkModelAdapter,
        PrismaAuditAdapter,
        OUTBOX_PORT,
        PrismaCopilotIdempotencyAdapter,
        "COPILOT_CLOCK",
        "COPILOT_LOGGER",
        "OBSERVABILITY_PORT",
      ],
    },
  ],
  exports: [],
})
export class AiCopilotModule {}
