# Langfuse Adapter (via OTLP)

## Quick start

- Set environment:
  - `OBSERVABILITY_PROVIDER=langfuse`
  - `LANGFUSE_BASE_URL=<https://cloud.langfuse.com/otlp>` (or your self-host base + `/otlp`)
  - `LANGFUSE_PUBLIC_KEY=...`
  - `LANGFUSE_SECRET_KEY=...`
  - Optional: `OTEL_EXPORTER_OTLP_ENDPOINT` (overrides base URL)
  - Optional: `OBSERVABILITY_SAMPLE_RATIO=1` (0–1)
- Run API/worker; tracing starts during bootstrap (`setupTracing`).

## How it works

- We use OpenTelemetry NodeSDK with OTLP HTTP exporter.
- Langfuse auth is sent via OTLP headers (`Basic <public:secret>`).
- Copilot runtime talks to `ObservabilityPort`; Langfuse is selected by env, not by code.

## Local dev

- Add the env vars above to `.env` / `.env.local`.
- For self-host: set `LANGFUSE_BASE_URL=http://localhost:3000/otlp` (or your ingress path) and confirm OTLP port is reachable.
- Sampling defaults to `OBSERVABILITY_SAMPLE_RATIO` (1.0 in dev/test).

## Deploy

- Set `OBSERVABILITY_PROVIDER=langfuse` and OTLP endpoint/keys in the deployment environment.
- Keep `OBSERVABILITY_MASKING_MODE=standard` (or `strict` in prod).
- Verify traces:
  - Start a Copilot chat turn.
  - Locate trace by `copilot.run.id` or `request.id` in Langfuse search.
