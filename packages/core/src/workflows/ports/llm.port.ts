export interface LlmPort {
  complete(input: {
    prompt: string;
    model?: string;
    temperature?: number;
    metadata?: Record<string, unknown>;
  }): Promise<{ output: string; decisionEvent?: string; raw?: unknown }>;
}
