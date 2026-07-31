import { type LanguageModelV2, type LanguageModelV2StreamPart } from "@ai-sdk/provider";

export type DeterministicScenario = {
  id: string;
  steps: Array<{
    expectedIntent?: string;
    assistantText?: string;
    toolCalls?: Array<{
      name: string;
      args: Record<string, unknown>;
    }>;
  }>;
};

// Global in-memory registry of scenarios keyed by tenantId
export const activeScenarios = new Map<
  string,
  { scenario: DeterministicScenario; currentStep: number }
>();

export function activateScenario(tenantId: string, scenario: DeterministicScenario) {
  activeScenarios.set(tenantId, { scenario, currentStep: 0 });
}

export function deactivateScenario(tenantId: string) {
  activeScenarios.delete(tenantId);
}

export class DeterministicLanguageModelV1 implements LanguageModelV2 {
  public readonly specificationVersion = "v2" as const;
  public readonly provider = "deterministic-provider";
  public readonly modelId = "deterministic-model";
  public readonly defaultObjectGenerationMode = "json";

  get supportsImageUrls() {
    return false;
  }
  get supportsStructuredOutputs() {
    return true;
  }
  get supportsToolCalls() {
    return true;
  }
  get supportedUrls(): any {
    return {};
  }

  constructor(private readonly tenantId: string) {}

  async doGenerate(): Promise<any> {
    throw new Error("doGenerate not implemented for DeterministicLanguageModelV1");
  }

  async doStream(options: any): Promise<{ stream: ReadableStream<any>; rawCall: any }> {
    console.log(`[DeterministicLanguageModelV1] doStream called for tenant ${this.tenantId}`);
    const active = activeScenarios.get(this.tenantId);
    if (!active) {
      console.log(`[DeterministicLanguageModelV1] Error: No active scenario`);
      throw new Error(`No active deterministic scenario found for tenant ${this.tenantId}`);
    }

    const { scenario, currentStep } = active;

    const stream = new ReadableStream({
      async start(controller) {
        const lastMessage = options.prompt?.[options.prompt.length - 1];

        console.log(
          `[DeterministicLanguageModelV1] Executing step ${currentStep} of scenario ${scenario?.id}`
        );
        const step = scenario.steps[currentStep];

        if (!step) {
          console.log(`[DeterministicLanguageModelV1] Ran out of steps, returning stop`);
          await new Promise((r) => setTimeout(r, 500));
          controller.enqueue({
            type: "finish",
            finishReason: "stop",
            usage: {
              promptTokens: 10,
              completionTokens: 10,
              inputTokens: { total: 10 },
              outputTokens: { total: 10 },
            },
          });
          controller.close();
          return;
        }

        if (step.assistantText) {
          console.log(
            `[DeterministicLanguageModelV1] Yielding assistantText: ${step.assistantText}`
          );
          const id = `txt_${Math.random().toString(36).substring(2, 9)}`;
          await new Promise((r) => setTimeout(r, 500));
          controller.enqueue({ type: "text-start", id });
          await new Promise((r) => setTimeout(r, 500));
          controller.enqueue({
            type: "text-delta",
            id,
            textDelta: step.assistantText,
            delta: step.assistantText,
          });
        }

        // Dynamic variable substitution
        let latestConfirmationId: string | undefined;
        if (options.prompt && Array.isArray(options.prompt)) {
          for (let i = options.prompt.length - 1; i >= 0; i--) {
            const msg = options.prompt[i];
            if (msg.role === "tool" && Array.isArray(msg.content)) {
              for (const contentPart of msg.content) {
                if (
                  contentPart.type === "tool-result" &&
                  contentPart.toolName === "prepare_cash_day_confirmation"
                ) {
                  if (
                    contentPart.result &&
                    typeof contentPart.result === "object" &&
                    "id" in contentPart.result
                  ) {
                    latestConfirmationId = (contentPart.result as any).id;
                  }
                  break;
                }
              }
            }
            if (latestConfirmationId) {
              break;
            }
          }
        }

        if (step.toolCalls && step.toolCalls.length > 0) {
          for (const call of step.toolCalls) {
            console.log(`[DeterministicLanguageModelV1] Yielding tool-call: ${call.name}`);
            let stringifiedArgs = JSON.stringify(call.args);
            if (latestConfirmationId) {
              stringifiedArgs = stringifiedArgs.replace(
                /\$\$LAST_CONFIRMATION_ID\$\$/g,
                latestConfirmationId
              );
              stringifiedArgs = stringifiedArgs.replace(
                /\$\$LAST_IDEMPOTENCY_KEY\$\$/g,
                `idemp-${latestConfirmationId}`
              );
            }
            await new Promise((r) => setTimeout(r, 500));
            controller.enqueue({
              type: "tool-call",
              toolCallType: "function",
              toolCallId: `call_${Math.random().toString(36).substring(2, 9)}`,
              toolName: call.name,
              input: stringifiedArgs,
              args: stringifiedArgs,
            });
          }
        }

        active.currentStep++;
        console.log(
          `[DeterministicLanguageModelV1] Step finished. Next step is ${active.currentStep}`
        );

        await new Promise((r) => setTimeout(r, 500));
        controller.enqueue({
          type: "finish",
          finishReason: step.toolCalls && step.toolCalls.length > 0 ? "tool-calls" : "stop",
          usage: {
            promptTokens: 10,
            completionTokens: 10,
            inputTokens: { total: 10 },
            outputTokens: { total: 10 },
          },
        });
        controller.close();
      },
    });

    return {
      stream,
      rawCall: { rawPrompt: "mock-prompt", rawSettings: {} },
    };
  }
}
