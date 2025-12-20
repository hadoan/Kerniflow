import { Module, Logger } from "@nestjs/common";
import { CopilotController } from "./presentation/http/copilot.controller";

const logger = new Logger("AiCopilotModule");
import { StreamCopilotChatUseCase } from "./application/use-cases/stream-copilot-chat.usecase";
import { PrismaAgentRunRepository } from "./infrastructure/persistence/prisma.agent-run.repo";
import { PrismaMessageRepository } from "./infrastructure/persistence/prisma.message.repo";
import { PrismaToolExecutionRepository } from "./infrastructure/persistence/prisma.tool-execution.repo";
import { ToolRegistry } from "./infrastructure/tools/tool-registry";
import { AiSdkModelAdapter } from "./infrastructure/model/ai-sdk.model-adapter";
import { PrismaAuditAdapter } from "./infrastructure/audit/prisma.audit.adapter";
import { PrismaOutboxAdapter } from "./infrastructure/outbox/prisma.outbox.adapter";
import { InMemoryIdempotencyAdapter } from "./infrastructure/idempotency/in-memory-idempotency.adapter";
import { TenantGuard } from "./presentation/http/guards/tenant.guard";
import { COPILOT_TOOLS } from "./application/ports/tool-registry.port";
import { DomainToolPort } from "./application/ports/domain-tool.port";
import { z } from "zod";
import { AuditPort } from "./application/ports/audit.port";
import { OutboxPort } from "./application/ports/outbox.port";
import { ClockPort } from "./application/ports/clock.port";
import { IdentityModule } from "../identity/identity.module";

const invoiceDraftTool: DomainToolPort = {
  name: "invoice.createDraft",
  description: "Create a draft invoice from provided summary data.",
  kind: "server",
  inputSchema: z.object({
    customer: z.string(),
    amount: z.number(),
    currency: z.string().default("USD"),
    description: z.string().optional(),
  }),
  async execute({ input }) {
    return { status: "draft", draft: input };
  },
};

const invoiceIssueTool: DomainToolPort = {
  name: "invoice.issue",
  description: "Issue a draft invoice (requires confirmation).",
  kind: "client-confirm",
  inputSchema: z.object({
    draftId: z.string(),
    confirmed: z.boolean().optional(),
  }),
};

@Module({
  imports: [IdentityModule],
  controllers: [], // [CopilotController],
  providers: [
    PrismaAgentRunRepository,
    PrismaMessageRepository,
    PrismaToolExecutionRepository,
    ToolRegistry,
    PrismaAuditAdapter,
    PrismaOutboxAdapter,
    InMemoryIdempotencyAdapter,
    TenantGuard,
    {
      provide: AiSdkModelAdapter,
      useFactory: (
        toolExec: PrismaToolExecutionRepository,
        audit: PrismaAuditAdapter,
        outbox: PrismaOutboxAdapter
      ) => {
        logger.debug("Creating AiSdkModelAdapter");
        return new AiSdkModelAdapter(toolExec, audit, outbox);
      },
      inject: [PrismaToolExecutionRepository, PrismaAuditAdapter, PrismaOutboxAdapter],
    },
    {
      provide: "COPILOT_CLOCK",
      useValue: { now: () => new Date() },
    },
    {
      provide: COPILOT_TOOLS,
      useValue: [invoiceDraftTool, invoiceIssueTool],
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
        clock: ClockPort
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
      ],
    },
  ],
  exports: [],
})
export class AiCopilotModule {}
