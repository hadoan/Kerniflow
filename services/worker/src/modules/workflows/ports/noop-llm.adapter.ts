import { Logger } from "@nestjs/common";
import type { LlmPort } from "@corely/core";

export class NoopLlmAdapter implements LlmPort {
  private readonly logger = new Logger(NoopLlmAdapter.name);

  async complete(input: {
    prompt: string;
    model?: string;
    temperature?: number;
    metadata?: Record<string, unknown>;
  }): Promise<{ output: string; decisionEvent?: string; raw?: unknown }> {
    this.logger.log(
      JSON.stringify({
        message: "workflow.llm.stub",
        model: input.model ?? "noop",
      })
    );

    return {
      output: "Noop LLM response",
      raw: { prompt: input.prompt },
    };
  }
}
