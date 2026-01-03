import { Injectable } from "@nestjs/common";
import { context, trace, SpanStatusCode } from "@opentelemetry/api";
import {
  type NormalizedMessageSnapshot,
  type ObservabilityAttributes,
  type ObservabilityPort,
  type ObservabilitySpanRef,
  type StartTurnTraceParams,
  type ToolObservation,
  type TurnInputPayload,
  type TurnOutputPayload,
} from "@corely/kernel";
import { maskJsonValue, maskString } from "./masking";

type MaskingMode = "off" | "standard" | "strict";

interface ObservabilityOptions {
  readonly maskingMode: MaskingMode;
}

@Injectable()
export class OtelObservabilityAdapter implements ObservabilityPort {
  private readonly tracer = trace.getTracer("copilot");

  constructor(private readonly options: ObservabilityOptions) {}

  startTurnTrace(params: StartTurnTraceParams): ObservabilitySpanRef {
    const span = this.tracer.startSpan("copilot.turn", {
      attributes: {
        "copilot.turn.id": params.turnId,
        "copilot.run.id": params.runId,
        "copilot.intent": params.intent ?? "unknown",
        "copilot.entrypoint": params.entrypoint,
        "copilot.environment": params.environment,
        "tenant.id": params.tenantId,
        "workspace.id": params.workspaceId ?? "unknown",
        "workspace.kind": params.workspaceKind ?? "unknown",
        "user.id": params.userId,
        "request.id": params.requestId,
        "ai.provider": params.provider ?? "unspecified",
        "ai.model": params.model ?? "unspecified",
        "tools.requested": params.toolsRequested ?? [],
        "trace.name": params.traceName,
      },
    });
    const ctx = trace.setSpan(context.active(), span);
    const spanContext = span.spanContext();
    return {
      span,
      context: ctx,
      traceId: spanContext.traceId,
      spanId: spanContext.spanId,
    };
  }

  setAttributes(spanRef: ObservabilitySpanRef, attributes: ObservabilityAttributes): void {
    spanRef.span.setAttributes(attributes);
  }

  recordTurnInput(spanRef: ObservabilitySpanRef, payload: TurnInputPayload): void {
    const maskedHistory = payload.history.map((msg) => this.maskSnapshot(msg));
    const maskedInput = payload.userInput
      ? maskString(payload.userInput, this.options.maskingMode)
      : "";
    spanRef.span.addEvent("turn.input", {
      "turn.history": JSON.stringify(maskedHistory),
      "turn.user_input": maskedInput,
      "tools.requested": payload.toolsRequested ?? [],
    });
  }

  recordTurnOutput(spanRef: ObservabilitySpanRef, payload: TurnOutputPayload): void {
    const text = payload.text ? maskString(payload.text, this.options.maskingMode) : "";
    spanRef.span.addEvent("turn.output", {
      "turn.output.text": text,
      "turn.output.parts": payload.partsSummary ?? "",
    });
  }

  startSpan(
    name: string,
    attributes: ObservabilityAttributes,
    parent?: ObservabilitySpanRef
  ): ObservabilitySpanRef {
    const span = this.tracer.startSpan(name, { attributes }, parent?.context);
    const ctx = trace.setSpan(parent?.context ?? context.active(), span);
    const spanContext = span.spanContext();
    return { span, context: ctx, traceId: spanContext.traceId, spanId: spanContext.spanId };
  }

  endSpan(spanRef: ObservabilitySpanRef, status?: { code?: number; message?: string }): void {
    if (status?.code === SpanStatusCode.ERROR) {
      spanRef.span.setStatus({ code: SpanStatusCode.ERROR, message: status.message });
    }
    spanRef.span.end();
  }

  recordToolObservation(spanRef: ObservabilitySpanRef, observation: ToolObservation): void {
    spanRef.span.addEvent("tool.observation", {
      "tool.name": observation.toolName,
      "tool.call_id": observation.toolCallId,
      "tool.status": observation.status,
      "tool.duration_ms": observation.durationMs,
      "tool.error_type": observation.errorType ?? "",
      "tool.error_message": observation.errorMessage
        ? maskString(observation.errorMessage, this.options.maskingMode)
        : "",
      "tool.input": JSON.stringify(maskJsonValue(observation.input, this.options.maskingMode)),
      "tool.output": observation.output
        ? JSON.stringify(maskJsonValue(observation.output, this.options.maskingMode))
        : "",
    });
  }

  recordError(
    spanRef: ObservabilitySpanRef,
    error: Error,
    attributes?: ObservabilityAttributes
  ): void {
    spanRef.span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
    if (attributes) {
      spanRef.span.setAttributes(attributes);
    }
    spanRef.span.recordException({
      name: error.name,
      message: maskString(error.message, this.options.maskingMode),
      stack: this.options.maskingMode === "strict" ? undefined : error.stack,
    });
  }

  async flush(): Promise<void> {
    const provider = trace.getTracerProvider();
    if (typeof (provider as { forceFlush?: () => Promise<void> }).forceFlush === "function") {
      await (provider as { forceFlush: () => Promise<void> }).forceFlush();
    }
  }

  private maskSnapshot(snapshot: NormalizedMessageSnapshot): NormalizedMessageSnapshot {
    const maskedParts =
      snapshot.parts?.map((part) => {
        const masked: NormalizedMessageSnapshot["parts"][number] = {
          type: part.type,
          text: part.text ? maskString(part.text, this.options.maskingMode) : undefined,
          toolCallId: part.toolCallId,
          toolName: part.toolName,
          input: part.input ? maskJsonValue(part.input, this.options.maskingMode) : undefined,
          result: part.result ? maskJsonValue(part.result, this.options.maskingMode) : undefined,
        };
        return masked;
      }) ?? [];

    return {
      role: snapshot.role,
      content: snapshot.content
        ? maskString(snapshot.content, this.options.maskingMode)
        : undefined,
      parts: maskedParts.length ? maskedParts : undefined,
      toolCallId: snapshot.toolCallId,
      toolName: snapshot.toolName,
      timestamp: snapshot.timestamp,
    };
  }
}
