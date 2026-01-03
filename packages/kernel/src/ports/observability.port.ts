import { type Context, type Span } from "@opentelemetry/api";

export type ObservabilityAttributePrimitive = string | number | boolean | null;
export type ObservabilityAttributeValue =
  | ObservabilityAttributePrimitive
  | ObservabilityAttributePrimitive[];
export type ObservabilityAttributes = Record<string, ObservabilityAttributeValue>;

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };
export type ObservabilityErrorKind = "model" | "tool" | "validation" | "system";

export interface ObservabilitySpanRef {
  readonly span: Span;
  readonly context: Context;
  readonly traceId: string;
  readonly spanId: string;
}

export interface NormalizedMessagePart {
  readonly type: "text" | "tool-call" | "tool-result" | "data";
  readonly text?: string;
  readonly toolCallId?: string;
  readonly toolName?: string;
  readonly input?: JsonValue;
  readonly result?: JsonValue;
}

export interface NormalizedMessageSnapshot {
  readonly role: "system" | "user" | "assistant" | "tool";
  readonly content?: string;
  readonly parts?: NormalizedMessagePart[];
  readonly toolCallId?: string;
  readonly toolName?: string;
  readonly timestamp?: string;
}

export interface TurnInputPayload {
  readonly history: NormalizedMessageSnapshot[];
  readonly userInput?: string;
  readonly toolsRequested?: string[];
}

export interface TurnOutputPayload {
  readonly text?: string;
  readonly partsSummary?: string;
}

export interface ToolObservation {
  readonly toolName: string;
  readonly toolCallId: string;
  readonly input: JsonValue;
  readonly output?: JsonValue;
  readonly status: "ok" | "error" | "cancelled";
  readonly durationMs: number;
  readonly errorType?: string;
  readonly errorMessage?: string;
}

export interface StartTurnTraceParams {
  readonly traceName: string;
  readonly turnId: string;
  readonly runId: string;
  readonly tenantId: string;
  readonly userId: string;
  readonly workspaceKind?: string;
  readonly workspaceId?: string;
  readonly intent?: string;
  readonly entrypoint: string;
  readonly environment: string;
  readonly requestId: string;
  readonly toolsRequested?: string[];
  readonly model?: string;
  readonly provider?: string;
}

export interface ObservabilityPort {
  startTurnTrace(params: StartTurnTraceParams): ObservabilitySpanRef;
  setAttributes(spanRef: ObservabilitySpanRef, attributes: ObservabilityAttributes): void;
  recordTurnInput(spanRef: ObservabilitySpanRef, payload: TurnInputPayload): void;
  recordTurnOutput(spanRef: ObservabilitySpanRef, payload: TurnOutputPayload): void;
  startSpan(
    name: string,
    attributes: ObservabilityAttributes,
    parent?: ObservabilitySpanRef
  ): ObservabilitySpanRef;
  endSpan(spanRef: ObservabilitySpanRef, status?: { code?: number; message?: string }): void;
  recordToolObservation(spanRef: ObservabilitySpanRef, observation: ToolObservation): void;
  recordError(
    spanRef: ObservabilitySpanRef,
    error: Error,
    attributes?: ObservabilityAttributes,
    kind?: ObservabilityErrorKind
  ): void;
  flush(): Promise<void>;
}
