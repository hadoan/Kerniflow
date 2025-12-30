# Copilot Streaming (AI SDK 5) Overview

This document explains how the Corely Copilot works end-to-end: streaming protocol, backend architecture, tool registration, idempotency, and how to add new tools or customize message rendering.

## Why Data Stream Protocol (AI SDK)

- We use Vercel AI SDK 5 with the default UI message stream (Data Stream Protocol) because:
  - It handles text, tool calls, tool results, and custom data parts in one stream.
  - `@ai-sdk/react` `useChat` consumes it directly; no custom parsing is needed.
  - Multi-step tool calls (server + client-confirm) are supported out of the box.

## Backend Architecture

- **Module**: `services/api/src/modules/ai-copilot`
- **Domain/Application**: framework-free ports (no Nest/Prisma imports in domain/application).
- **Adapters**:
  - Model: `infrastructure/model/ai-sdk.model-adapter.ts` (OpenAI/Anthropic; configurable via `AI_MODEL_PROVIDER` and `AI_MODEL_ID`)
  - Persistence: Prisma repos for `AgentRun`, `Message`, `ToolExecution`
  - Audit/Outbox: Prisma adapters
  - Idempotency: In-memory adapter (replaceable with persistent store)
  - Tools: Registry + AI SDK tool factory
- **Controller**: `adapters/http/copilot.controller.ts`
- **Guards**: Auth guard + `TenantGuard` requiring `X-Tenant-Id`; `X-Idempotency-Key` required.

### Data Model (Prisma)

Defined in `packages/data/prisma/schema/80_ai.prisma`:

- `AgentRun`: id, tenantId, createdByUserId, status, timestamps, metadataJson
- `Message`: id, tenantId, runId, role, partsJson, createdAt
- `ToolExecution`: id, tenantId, runId, toolCallId (unique with tenant/run), toolName, input/output/status, timestamps, errorJson

### Streaming Endpoint

- `POST /copilot/chat`
- Headers: `Authorization`, `X-Tenant-Id`, `X-Idempotency-Key`
- Body: `{ id?, messages: UIMessage[], requestData: { tenantId, locale?, activeModule?, modelHint? } }`
- Uses `streamText` with AI SDK tools, pipes the UI message stream to the Express response via `pipeUIMessageStreamToResponse`.
- Idempotency: duplicate `X-Idempotency-Key` yields 409 response.

### Model Provider Selection

- Env vars:
  - `AI_MODEL_PROVIDER` = `openai` | `anthropic` (default: openai)
  - `AI_MODEL_ID` (default: gpt-4o-mini or claude-3-haiku-20240307)
  - `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`

## Tool System

- **Port**: `DomainToolPort` (`name`, `description`, `inputSchema` (zod), `kind`: server | client-confirm | client-auto, optional `execute` for server tools).
- **Registry**: `ToolRegistry` reads DI token `COPILOT_TOOLS` (multi-provider). Other modules can add tools without coupling.
- **AI SDK tools**: built via `tools.factory.ts`, wrapping `DomainToolPort` into AI SDK `tool(...)` definitions.
- **Execution logging**: creates `ToolExecution` rows (pending -> completed/failed), writes AuditLog, emits OutboxEvent (`copilot.tool.completed`).
- **Idempotency**: uniqueness is enforced on `(tenantId, runId, toolCallId)` via Prisma unique.

### Add a New Tool

1. Define a `DomainToolPort` object (zod schema, name, description, kind, execute if server tool).
2. Provide it via Nest multi-provider in the contributing module:

```ts
{
  provide: COPILOT_TOOLS,
  useValue: myTool,
}
```

3. For server tools, implement `execute({ tenantId, userId, input })` calling your domain use-case/ports (not Prisma directly). Ensure it is tenant-scoped and idempotent.
4. For confirmation tools, omit `execute` and set `kind: "client-confirm"`; the UI will render a card and send tool output via `addToolResult`.
5. If the tool mutates state, ensure your use-case writes AuditLog and (if applicable) OutboxEvent.

## Frontend Integration

- **Screen**: `apps/web/src/routes/copilot.tsx`
- **Hook**: `useChat` with `DefaultChatTransport` (AI SDK 5). Set headers/body via `prepareHeaders`/`prepareBody` (do not use static `body`/`headers` props).
- **Headers**: include `Authorization`, `X-Tenant-Id`, `X-Idempotency-Key` (generate per send).
- **Body**: include `messages` and `requestData` (tenantId, locale, modelHint, etc.).
- **Rendering**: render `message.parts` (text, tool-call, tool-result, data). The provided `MessageBubble` and `ConfirmCard` components show a basic chat with tool confirmation.
- **Client-confirm tools**: use `addToolResult({ toolCallId, toolName, result })` to continue the stream.

### Customizing Message Rendering

- Inspect `message.parts` for structured content:
  - `type: "text"` → render markdown/plaintext
  - `type: "tool-call"` → render a card; if confirmation needed, show buttons and send `addToolResult`
  - `type: "tool-result"` → render result payload
  - `type: "data"` → custom metadata (e.g., runId, toolExecutionId)
- You can replace `MessageBubble` with a richer component (avatars, timestamps, markdown renderer) and add per-role styling.

## Reliability & Governance

- Auth + Tenant guard enforced on `/copilot/chat`.
- Idempotency required via `X-Idempotency-Key`.
- Tool executions are tenant-scoped, logged (AuditLog), and OutboxEvent emitted.
- Domain/application layers stay framework-free; adapters handle Nest/Prisma specifics.

## Troubleshooting

- **No stream / buffering**: Ensure proxies don’t buffer SSE/stream responses; use `pipeUIMessageStreamToResponse` and avoid JSON buffering middlewares.
- **Custom request options ignored**: In AI SDK 5, use `DefaultChatTransport.prepareHeaders/prepareBody`; static `headers/body` on `useChat` are ignored.
- **Env**: Set `AI_MODEL_PROVIDER`, `AI_MODEL_ID`, and provider API keys. Missing keys will cause model calls to fail.
- **Tool errors**: Check `ToolExecution` table for status/errors; ensure zod schema matches tool inputs.

## Next steps

- Replace in-memory idempotency with persistent storage.
- Add real tool implementations that call domain use-cases (expenses/invoices) via ports.
- Add nav entry to Copilot UI and hook auth/tenant context for headers.
- Add tests: tool registry resolution, idempotency adapter, stream smoke test.
