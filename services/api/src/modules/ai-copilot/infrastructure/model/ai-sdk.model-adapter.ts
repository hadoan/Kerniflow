import { Injectable, Logger } from "@nestjs/common";
import type { EnvService } from "@corely/config";
import { streamText, convertToModelMessages, stepCountIs, validateUIMessages } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { LanguageModelPort } from "../../application/ports/language-model.port";
import type { DomainToolPort } from "../../application/ports/domain-tool.port";
import { buildAiTools } from "../tools/tools.factory";
import type { ToolExecutionRepositoryPort } from "../../application/ports/tool-execution-repository.port";
import type { AuditPort } from "../../application/ports/audit.port";
import type { OutboxPort } from "@corely/kernel";
import { buildCollectInputsTool } from "../tools/interactive-tools";
import { type CopilotUIMessage } from "../../domain/types/ui-message";
import { CopilotDataPartSchemas } from "@corely/contracts";
import { type ObservabilityPort, type ObservabilitySpanRef } from "@corely/kernel";
import { type LanguageModelUsage, type StreamTextResult } from "ai";
import { type WorkspaceKind, PromptRegistry } from "@corely/prompts";
import { PromptUsageLogger } from "../../../../shared/prompts/prompt-usage.logger";
import { buildPromptContext } from "../../../../shared/prompts/prompt-context";
import { copilotMessageMetadataSchema } from "../../application/validation/copilot-message-metadata.schema";
import { type PosVerticalId, type SurfaceId } from "@corely/contracts";
import { DeterministicLanguageModelV1 } from "./deterministic-model-registry";

const normalizePromptLanguage = (locale?: string): string => {
  const normalized = locale?.trim().toLowerCase();

  if (normalized?.startsWith("vi")) {
    return "vi";
  }
  if (normalized?.startsWith("de")) {
    return "de";
  }

  return "en";
};

const resolveSystemPromptId = (
  surfaceId?: SurfaceId,
  activeAppId?: string,
  verticalId?: PosVerticalId | null
): string => {
  if (surfaceId === "crm") {
    return "crm.copilot.system";
  }

  if (surfaceId === "pos" && verticalId === "restaurant") {
    return "restaurant.copilot.system";
  }

  if (activeAppId === "restaurant") {
    return "restaurant.copilot.system";
  }

  return "copilot.system";
};

@Injectable()
export class AiSdkModelAdapter implements LanguageModelPort {
  private readonly openai: ReturnType<typeof createOpenAI>;
  private readonly anthropic: ReturnType<typeof createAnthropic>;
  private readonly logger = new Logger(AiSdkModelAdapter.name);

  constructor(
    private readonly toolExecutions: ToolExecutionRepositoryPort,
    private readonly audit: AuditPort,
    private readonly outbox: OutboxPort,
    private readonly env: EnvService,
    private readonly observability: ObservabilityPort,
    private readonly promptRegistry: PromptRegistry,
    private readonly promptUsageLogger: PromptUsageLogger
  ) {
    this.openai = createOpenAI({
      apiKey: this.env.OPENAI_API_KEY || "",
    });
    this.anthropic = createAnthropic({
      apiKey: this.env.ANTHROPIC_API_KEY || "",
    });
  }

  async streamChat(params: {
    messages: CopilotUIMessage[];
    tools: DomainToolPort[];
    locale?: string;
    runId: string;
    tenantId: string;
    toolTenantId?: string;
    workspaceId?: string;
    userId: string;
    workspaceKind?: WorkspaceKind;
    environment?: string;
    activeAppId?: string;
    surfaceId?: SurfaceId;
    verticalId?: PosVerticalId | null;
    observability: ObservabilitySpanRef;
  }): Promise<{ result: StreamTextResult<any, any>; usage?: LanguageModelUsage }> {
    const toolTenantId = params.toolTenantId ?? params.tenantId;
    const aiTools = buildAiTools(params.tools, {
      toolExecutions: this.toolExecutions,
      audit: this.audit,
      outbox: this.outbox,
      locale: params.locale,
      tenantId: toolTenantId,
      workspaceId: params.workspaceId,
      activeAppId: params.activeAppId,
      runId: params.runId,
      userId: params.userId,
      observability: this.observability,
      parentSpan: params.observability,
    });

    const provider = process.env.E2E_AI_PROVIDER || this.env.AI_MODEL_PROVIDER;
    const modelId = this.env.AI_MODEL_ID;

    let model;
    if (provider === "deterministic") {
      model = new DeterministicLanguageModelV1(toolTenantId);
    } else {
      model = provider === "anthropic" ? this.anthropic(modelId) : this.openai(modelId);
    }

    const promptContext = buildPromptContext({
      env: this.env,
      tenantId: toolTenantId,
      workspaceKind: params.workspaceKind,
      environmentOverride: params.environment,
      surfaceId: params.surfaceId,
    });

    const systemPromptId = resolveSystemPromptId(
      params.surfaceId,
      params.activeAppId,
      params.verticalId
    );
    const systemPromptVariables =
      systemPromptId === "restaurant.copilot.system"
        ? {
            LANGUAGE: normalizePromptLanguage(params.locale),
            SEARCH_MENU_TOOL: "restaurant_searchMenuItems",
            BUILD_ORDER_DRAFT_TOOL: "restaurant_buildOrderDraft",
            DRAFT_VOID_TOOL: "restaurant_draftVoidRequest",
            DRAFT_DISCOUNT_TOOL: "restaurant_draftDiscountRequest",
          }
        : systemPromptId === "crm.copilot.system"
          ? {
              LANGUAGE: normalizePromptLanguage(params.locale),
              CRM_CREATE_DEAL_TOOL: "crm_createDealFromText",
              CRM_CREATE_PARTY_TOOL: "crm_createPartyFromText",
              CRM_FOLLOW_UP_TOOL: "crm_generateFollowUps",
              COLLECT_INPUTS_TOOL: "collect_inputs",
            }
          : {
              CUSTOMER_SEARCH_TOOL: "customer_search",
              INVOICE_CREATE_FROM_CUSTOMER_TOOL: "invoice_create_from_customer",
              COLLECT_INPUTS_TOOL: "collect_inputs",
              LANGUAGE: normalizePromptLanguage(params.locale),
            };
    const systemPrompt = this.promptRegistry.render(
      systemPromptId,
      promptContext,
      systemPromptVariables
    );
    this.observability.setAttributes(params.observability, {
      "prompt.id": systemPrompt.promptId,
      "prompt.version": systemPrompt.promptVersion,
      "prompt.hash": systemPrompt.promptHash,
    });
    this.promptUsageLogger.logUsage({
      promptId: systemPrompt.promptId,
      promptVersion: systemPrompt.promptVersion,
      promptHash: systemPrompt.promptHash,
      modelId,
      provider,
      tenantId: toolTenantId,
      userId: params.userId,
      runId: params.runId,
      purpose: systemPromptId,
    });

    const collectInputsDescription = this.promptRegistry.render(
      "copilot.collect_inputs.description",
      promptContext,
      { LANGUAGE: normalizePromptLanguage(params.locale) }
    );
    this.promptUsageLogger.logUsage({
      promptId: collectInputsDescription.promptId,
      promptVersion: collectInputsDescription.promptVersion,
      promptHash: collectInputsDescription.promptHash,
      modelId,
      provider,
      tenantId: toolTenantId,
      userId: params.userId,
      runId: params.runId,
      purpose: "copilot.tool.collect_inputs",
    });

    const toolset = {
      ...aiTools,
      collect_inputs: buildCollectInputsTool(collectInputsDescription.content),
    };

    this.logger.debug(`Starting streamText with ${Object.keys(toolset).length} tools`);

    const systemMessage: CopilotUIMessage = {
      id: `copilot-system-${params.runId}`,
      role: "system",
      parts: [
        {
          type: "text" as const,
          text: systemPrompt.content,
        },
      ],
    };

    const messagesWithIds = [systemMessage, ...params.messages].map((message, index) => ({
      ...message,
      id: message.id ?? `copilot-${params.runId}-${index}`,
    }));

    const normalizedMessages = messagesWithIds
      .map((message) => {
        const normalizeToolPart = (part: CopilotUIMessage["parts"][number]) => {
          if (!part || typeof part !== "object") {
            return part;
          }
          if (typeof part.type !== "string" || !part.type.startsWith("tool-")) {
            return part;
          }
          const toolPart = part as {
            type: string;
            state?: string;
            toolCallId?: string;
            input?: unknown;
            rawInput?: unknown;
            output?: unknown;
            result?: unknown;
            errorText?: string;
          };
          if (!toolPart.toolCallId) {
            return undefined;
          }
          if (toolPart.state === "output-available" && toolPart.output === undefined) {
            if (toolPart.result !== undefined) {
              return { ...toolPart, output: toolPart.result };
            }
            return {
              ...toolPart,
              state: "output-error",
              errorText: toolPart.errorText ?? "tool output missing",
              rawInput: toolPart.rawInput ?? {},
            };
          }
          if (toolPart.state !== "input-streaming" && toolPart.input == null) {
            if (toolPart.rawInput != null) {
              return { ...toolPart, input: toolPart.rawInput };
            }
            if (toolPart.state === "output-error") {
              return { ...toolPart, rawInput: {} };
            }
            return undefined;
          }
          return toolPart;
        };

        if (Array.isArray(message.parts) && message.parts.length > 0) {
          return {
            ...message,
            parts: message.parts
              .map(normalizeToolPart)
              .filter(
                (part): part is CopilotUIMessage["parts"][number] =>
                  Boolean(part) && typeof part === "object"
              ),
          };
        }
        const content = (message as { content?: unknown }).content;
        if (typeof content === "string") {
          return {
            ...message,
            parts: [{ type: "text" as const, text: content }],
          };
        }
        return undefined;
      })
      .filter(
        (message): message is CopilotUIMessage =>
          Boolean(message) && Array.isArray(message.parts) && message.parts.length > 0
      );

    const validatedMessages = await validateUIMessages<CopilotUIMessage>({
      messages: normalizedMessages,
      metadataSchema: copilotMessageMetadataSchema,
      dataSchemas: CopilotDataPartSchemas,
      tools: toolset,
    });

    const modelMessages = await convertToModelMessages(validatedMessages, {
      tools: toolset,
      ignoreIncompleteToolCalls: true,
    });

    const result = streamText({
      model,
      messages: modelMessages,
      tools: toolset,
      stopWhen: stepCountIs(5),
      experimental_telemetry: {
        isEnabled: true,
        functionId: "copilot.streamChat",
      },
    });

    return { result };
  }
}
