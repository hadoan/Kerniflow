import { NodeSDK } from "@opentelemetry/sdk-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { Resource } from "@opentelemetry/resources";
import { SemanticResourceAttributes } from "@opentelemetry/semantic-conventions";
import { ParentBasedSampler, TraceIdRatioBasedSampler } from "@opentelemetry/sdk-trace-base";

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
    return;
  }

  const provider = process.env.OBSERVABILITY_PROVIDER ?? "none";
  if (provider === "none") {
    return;
  }

  const endpoint =
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT ??
    (provider === "langfuse" ? process.env.LANGFUSE_BASE_URL : undefined);

  if (!endpoint) {
     
    console.warn("[observability] tracing disabled: missing OTLP endpoint");
    return;
  }

  const sampleRatioRaw = Number(process.env.OBSERVABILITY_SAMPLE_RATIO ?? "1");
  const sampleRatio = Number.isFinite(sampleRatioRaw) ? sampleRatioRaw : 1;

  sdk = new NodeSDK({
    traceExporter: new OTLPTraceExporter({
      url: endpoint,
      headers: buildHeaders(),
    }),
    resource: new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
      [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.APP_ENV ?? "dev",
    }),
    sampler: new ParentBasedSampler({
      root: new TraceIdRatioBasedSampler(Math.max(0, Math.min(1, sampleRatio))),
    }),
  });

  const startResult = sdk.start();
  if (startResult instanceof Promise) {
    await startResult;
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
