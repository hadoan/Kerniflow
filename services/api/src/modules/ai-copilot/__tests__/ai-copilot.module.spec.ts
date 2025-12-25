import { describe, it, expect } from "vitest";
import { AiCopilotModule } from "../ai-copilot.module";
import { CopilotController } from "../adapters/http/copilot.controller";
import { StreamCopilotChatUseCase } from "../application/use-cases/stream-copilot-chat.usecase";
import { AiSdkModelAdapter } from "../infrastructure/model/ai-sdk.model-adapter";
import { ToolRegistry } from "../infrastructure/tools/tool-registry";
import { PrismaAgentRunRepository } from "../infrastructure/adapters/prisma-agent-run-repository.adapter";
import { PrismaMessageRepository } from "../infrastructure/adapters/prisma-message-repository.adapter";
import { PrismaToolExecutionRepository } from "../infrastructure/adapters/prisma-tool-execution-repository.adapter";
import { COPILOT_TOOLS } from "../application/ports/tool-registry.port";

describe("AiCopilotModule", () => {
  it("should be defined", () => {
    expect(AiCopilotModule).toBeDefined();
  });

  it("should export module metadata", () => {
    const metadata = Reflect.getMetadata("imports", AiCopilotModule);
    expect(metadata).toBeDefined();
  });

  it("should have CopilotController in controllers", () => {
    const controllers = Reflect.getMetadata("controllers", AiCopilotModule);
    expect(controllers).toBeDefined();
    expect(controllers).toContain(CopilotController);
  });

  it("should have required providers configured", () => {
    const providers = Reflect.getMetadata("providers", AiCopilotModule);
    expect(providers).toBeDefined();

    // Check for repository providers
    const hasAgentRunRepo = providers.some(
      (p: any) => p === PrismaAgentRunRepository || p.provide === PrismaAgentRunRepository
    );
    const hasMessageRepo = providers.some(
      (p: any) => p === PrismaMessageRepository || p.provide === PrismaMessageRepository
    );
    const hasToolExecRepo = providers.some(
      (p: any) => p === PrismaToolExecutionRepository || p.provide === PrismaToolExecutionRepository
    );

    expect(hasAgentRunRepo).toBe(true);
    expect(hasMessageRepo).toBe(true);
    expect(hasToolExecRepo).toBe(true);

    // Check for other key providers
    const hasToolRegistry = providers.some(
      (p: any) => p === ToolRegistry || p.provide === ToolRegistry
    );
    expect(hasToolRegistry).toBe(true);

    // Check for factory providers
    const hasModelAdapter = providers.some((p: any) => p.provide === AiSdkModelAdapter);
    expect(hasModelAdapter).toBe(true);

    const hasUseCase = providers.some((p: any) => p.provide === StreamCopilotChatUseCase);
    expect(hasUseCase).toBe(true);

    // Check for token providers
    const hasClock = providers.some((p: any) => p.provide === "COPILOT_CLOCK");
    expect(hasClock).toBe(true);

    const hasTools = providers.some((p: any) => p.provide === COPILOT_TOOLS);
    expect(hasTools).toBe(true);
  });

  it("should configure AiSdkModelAdapter as factory provider", () => {
    const providers = Reflect.getMetadata("providers", AiCopilotModule);
    const adapterProvider = providers.find((p: any) => p.provide === AiSdkModelAdapter);

    expect(adapterProvider).toBeDefined();
    expect(adapterProvider.useFactory).toBeDefined();
    expect(typeof adapterProvider.useFactory).toBe("function");
    expect(adapterProvider.inject).toBeDefined();
    expect(adapterProvider.inject).toContain(PrismaToolExecutionRepository);
  });

  it("should configure StreamCopilotChatUseCase as factory provider", () => {
    const providers = Reflect.getMetadata("providers", AiCopilotModule);
    const useCaseProvider = providers.find((p: any) => p.provide === StreamCopilotChatUseCase);

    expect(useCaseProvider).toBeDefined();
    expect(useCaseProvider.useFactory).toBeDefined();
    expect(typeof useCaseProvider.useFactory).toBe("function");
    expect(useCaseProvider.inject).toBeDefined();
    expect(useCaseProvider.inject.length).toBeGreaterThan(0);
  });

  it("should have COPILOT_CLOCK configured with now() function", () => {
    const providers = Reflect.getMetadata("providers", AiCopilotModule);
    const clockProvider = providers.find((p: any) => p.provide === "COPILOT_CLOCK");

    expect(clockProvider).toBeDefined();
    expect(clockProvider.useValue).toBeDefined();
    expect(clockProvider.useValue.now).toBeDefined();
    expect(typeof clockProvider.useValue.now).toBe("function");

    // Verify clock returns a Date
    const date = clockProvider.useValue.now();
    expect(date).toBeInstanceOf(Date);
  });

  it("should have COPILOT_TOOLS configured", () => {
    const providers = Reflect.getMetadata("providers", AiCopilotModule);
    const toolsProvider = providers.find((p: any) => p.provide === COPILOT_TOOLS);

    expect(toolsProvider).toBeDefined();
    expect(toolsProvider.useValue || toolsProvider.useFactory).toBeDefined();
    if (toolsProvider.useValue) {
      expect(Array.isArray(toolsProvider.useValue)).toBe(true);
      expect(toolsProvider.useValue.length).toBeGreaterThan(0);
    } else {
      expect(typeof toolsProvider.useFactory).toBe("function");
      expect(Array.isArray(toolsProvider.inject)).toBe(true);
      expect(toolsProvider.inject.length).toBeGreaterThan(0);
    }
  });
});
