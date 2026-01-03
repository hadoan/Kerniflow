# Debugging & Trace Lookup

## Find trace IDs

- Every Copilot request carries `x-trace-id` (set by middleware) and is stored as `AgentRun.traceId`.
- Tool executions and message records also store `traceId`.
- API errors return `traceId` in ProblemDetails responses.

## Locate traces

- In Langfuse/OTLP backend, search by:
  - `copilot.run.id` (runId)
  - `request.id` (x-trace-id)
  - `tenant.id` / `user.id`
  - `copilot.turn.id`
- Root span name: `copilot.turn`; trace name: `copilot.turn:<intent>`.

## Common checks

- Turn shows history snapshot event `turn.input` and final output event `turn.output`.
- Tool spans (`tool.<name>`) include args/results (masked), duration, and status.
- Model span (`copilot.model`) includes provider/model attributes.
- Sampling: confirm `OBSERVABILITY_SAMPLE_RATIO` > 0 and endpoint/keys are set.

## When missing traces

- Ensure `OBSERVABILITY_PROVIDER` is not `none`.
- Verify OTLP endpoint/headers reachable from API/worker.
- Check masking mode: `strict` may hide error stacks; switch to `standard` for debugging (not in prod).
