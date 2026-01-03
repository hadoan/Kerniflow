# Privacy, Masking, Sampling

## Masking modes

- `OBSERVABILITY_MASKING_MODE` = `off` | `standard` | `strict`
  - Standard: redact API keys/tokens, emails, phone numbers in messages and tool args/results.
  - Strict: stronger redaction; omits error stacks; replaces patterns with `[redacted]`.
- Applied to:
  - Turn history snapshots (content + parts)
  - Turn input/output events
  - Tool observations (args/results, errors)

## Span filtering

- OTLP export only starts when `OBSERVABILITY_PROVIDER` ≠ `none`.
- Instrumentation scopes:
  - Copilot spans (`copilot.*`, `tool.*`, `store.*`) emitted explicitly.
  - Additional scopes can be filtered at the collector if needed.

## Sampling

- `OBSERVABILITY_SAMPLE_RATIO` (0–1):
  - Dev/test: recommended `1`.
  - Prod: start at `0.1–0.3` for general traffic; increase for Copilot-only endpoints.
- Parent-based sampler keeps child spans when parent is sampled.

## PII & secrets

- Regex-based masking for emails, phone numbers, and token-like strings.
- Avoid logging stacks in prod by using `strict` masking.
- Do not log auth headers or raw request bodies in Copilot spans.
