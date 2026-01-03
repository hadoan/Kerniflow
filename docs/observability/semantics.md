# Copilot Trace Semantics

## Boundaries

- Trace = one Copilot turn (user request → assistant completes response).
- Session/grouping = `runId` (conversation thread).
- Root span name: `copilot.turn`; trace name: `copilot.turn:<intentOrTopic>`.

## Span naming

- `copilot.turn` (root)
- `copilot.model` (LLM invocation/stream)
- `tool.<toolName>` (tool execution)
- `store.messages` (history persistence)
- Domain spans: `domain.<module>.<useCase>` as needed.

## Required attributes

- Identity: `tenant.id`, `workspace.id`, `workspace.kind`, `user.id`
- Routing: `copilot.run.id`, `copilot.turn.id`, `request.id`, `copilot.intent`, `copilot.entrypoint`, `copilot.environment`
- Model: `ai.provider`, `ai.model`
- Tools: `tools.requested`, `tools.executed` (events)
- Tags: optional `copilot.tags[]`

## Message normalization

- `history`: array of messages
  - `role`: system | user | assistant | tool
  - `content`: text string (if present)
  - `parts[]`: typed parts
    - `text` { text }
    - `tool-call` { toolCallId, toolName, input }
    - `tool-result` { toolCallId, toolName, result }
    - `data` { text? }
  - `timestamp?`
- `turn.userInput`: last user text (if available)
- `turn.assistantOutput`: final text; `partsSummary`: short summary (length, etc.)

## Tool observation payload

- `tool.name`, `tool.call_id`, `tool.status` (ok/error/cancelled)
- `tool.input`, `tool.output` (masked), `tool.duration_ms`
- `tool.error_type`, `tool.error_message`

## Tokens & cost

- `tokens.input`, `tokens.output`, `tokens.total` (from usage when available)
- `cost.usd` (enriched when pricing is known)
- `pricing.source` (provider/manual/estimated)

## Errors

- `error.kind`: model | tool | validation | system
- `error.code`: stable code
- `error.message`: sanitized
- `error.stack`: omitted when masking mode is `strict`
