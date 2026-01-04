import { NodeSDK } from "@opentelemetry/sdk-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { Resource } from "@opentelemetry/resources";
import { SemanticResourceAttributes } from "@opentelemetry/semantic-conventions";
import { ParentBasedSampler, TraceIdRatioBasedSampler } from "@opentelemetry/sdk-trace-base";

console.info("[observability] setup-tracing module loaded");

let sdk: NodeSDK | undefined;

function parseHeaders(input: string | undefined): Record<string, string> | undefined {
  if (!input) {
    return undefined;
  }
  const entries = input
    .split(",")
    .map((pair) => pair.trim())
    .filter(Boolean)
    .map((pair) => pair.split("="))
    .filter((parts) => parts.length === 2)
    .map(([key, value]) => [key.trim(), value.trim()] as const);
  if (!entries.length) {
    return undefined;
  }
  return Object.fromEntries(entries);
}

function buildHeaders(): Record<string, string> | undefined {
  const explicit = parseHeaders(process.env.OTEL_EXPORTER_OTLP_HEADERS);
  if (explicit) {
    return explicit;
  }
  const publicKey = process.env.LANGFUSE_PUBLIC_KEY;
  const secretKey = process.env.LANGFUSE_SECRET_KEY;
  if (publicKey && secretKey) {
    const token = Buffer.from(`${publicKey}:${secretKey}`).toString("base64");
    return { authorization: `Basic ${token}` };
  }
  return undefined;
}

export async function setupTracing(serviceName: string): Promise<void> {
  if (sdk) {
    console.info("[observability] tracing already initialized");
    return;
  }

  const provider = process.env.OBSERVABILITY_PROVIDER ?? "none";
  console.info("[observability] setupTracing invoked", {
    provider,
    langfuseBase:
      process.env.LANGFUSE_BASE_URL ?? process.env.LANGFUSE_HOST ?? process.env.LANGFUSE_URL,
    otlpEndpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
  });

  if (provider === "none") {
    console.info("[observability] tracing disabled: OBSERVABILITY_PROVIDER=none");
    return;
  }

  const langfuseBase =
    process.env.LANGFUSE_BASE_URL ?? process.env.LANGFUSE_HOST ?? process.env.LANGFUSE_URL;
  const endpoint =
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT ??
    (provider === "langfuse" && langfuseBase
      ? `${langfuseBase.replace(/\/$/, "")}/otlp/v1/traces`
      : undefined);

  if (!endpoint) {
    console.warn("[observability] tracing disabled: missing OTLP endpoint");
    return;
  }

  const sampleRatioRaw = Number(process.env.OBSERVABILITY_SAMPLE_RATIO ?? "1");
  const sampleRatio = Number.isFinite(sampleRatioRaw) ? sampleRatioRaw : 1;

  let headers: Record<string, string> | undefined;
  try {
    headers = buildHeaders();
  } catch (error) {
    console.error("[observability] failed to build OTLP headers", error);
  }

  console.info("[observability] tracing enabled", {
    provider,
    endpoint,
    headerKeys: headers ? Object.keys(headers) : [],
    sampleRatio,
  });

  sdk = new NodeSDK({
    traceExporter: new OTLPTraceExporter({
      url: endpoint,
      headers,
    }),
    resource: new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
      [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.APP_ENV ?? "dev",
    }),
    sampler: new ParentBasedSampler({
      root: new TraceIdRatioBasedSampler(Math.max(0, Math.min(1, sampleRatio))),
    }),
  });

  try {
    const startResult = sdk.start();
    if (startResult instanceof Promise) {
      await startResult;
      console.info("[observability] tracing started");
    } else {
      console.info("[observability] tracing start invoked");
    }
  } catch (error) {
    console.error("[observability] failed to start tracing", error);
  }
}

export async function shutdownTracing(): Promise<void> {
  if (!sdk) {
    return;
  }
  const shutdownResult = sdk.shutdown();
  if (shutdownResult instanceof Promise) {
    await shutdownResult;
  }
  sdk = undefined;
}
