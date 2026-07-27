## AI Copilot integration

- **Frontend defaults**: `VITE_API_BASE_URL` now points to the real API (`http://localhost:3000`) and `VITE_API_MODE=real`. Set `VITE_API_MODE=mock` if you explicitly want to point to the mock server (`http://localhost:4000` or `VITE_MOCK_API_BASE_URL`).
- **Shared client**: Use `useCopilotChatOptions` from `apps/web/src/lib/copilot-api.ts` to configure `useChat` across pages. It injects `Authorization`, `X-Workspace-Id`, and `X-Idempotency-Key` headers and targets `/copilot/chat` or `/copilot/runs/:id/messages` for streaming.
- **Backend surface**: NestJS now exposes `POST /copilot/runs` to create a run, `GET /copilot/runs/:id` to fetch metadata, `GET /copilot/runs/:id/messages` to fetch history, and `POST /copilot/runs/:id/messages` to append + stream. Legacy `POST /copilot/chat` remains for compatibility.
- **Chat history + search**: `GET /copilot/threads`, `GET /copilot/threads/:threadId`, `GET /copilot/threads/:threadId/messages`, `POST /copilot/threads`, and `GET /copilot/threads/search` provide recent-chat sidebar and history search support. Aliased `/ai-copilot/*` routes are available for the same endpoints.
- **Running locally**: start `services/api` (`pnpm --filter services/api start:dev`) and `apps/web` (`pnpm --filter apps/web dev`). Ensure `VITE_API_MODE=real` and valid `VITE_API_BASE_URL`. For mock fallback, start `services/mock-server` and switch the mode.

### Tool Authoring Guardrails

- Use shared helpers from `services/api/src/modules/ai-copilot/infrastructure/tools/tool-utils.ts`:
  - `buildToolCtx(...)` for use-case context creation.
  - `validationError(...)` for standardized input-validation failures.
- Do not define per-file `buildCtx`/`validationError` in tool adapters anymore; this avoids tenant/workspace drift.
- In `execute(...)`, pass both `tenantId` and `workspaceId` into `buildToolCtx`.
  - `workspaceId` falls back to `tenantId` by default in `buildToolCtx`.
- Keep tool adapters thin:
  - validate with contracts (Zod),
  - build context via `buildToolCtx`,
  - call application use cases (no direct Prisma in tools).

### Model provider config

- Set `AI_MODEL_PROVIDER=openai` or `anthropic`.
- OpenAI default: `AI_MODEL_ID=gpt-4o-mini` and `OPENAI_API_KEY=<your-key>`.
- Anthropic sample: `AI_MODEL_PROVIDER=anthropic`, `AI_MODEL_ID=claude-3-5-sonnet-20240620`, `ANTHROPIC_API_KEY=sk-ant-...`.

### Interactive collect_inputs tool

- The backend registers a client-handled `collect_inputs` tool (AI SDK) so the model can request structured fields mid-conversation.
- Frontend renders the tool call as a `QuestionForm` and replies via `addToolResult` to continue the run automatically.

### Classes Copilot Tools v1

- `classes_listClassGroups` (READ): list class groups with optional active/search filters.
- `classes_listSessions` (READ): list sessions in a date range, optionally filtered by class/status.
- `classes_getSessionDetail` (READ): fetch one session and attendance health indicators.
- `classes_listNeedsAttentionSessions` (READ): show missing-attendance and unfinished-past session issues.
- `classes_getClassRoster` (READ): class roster with payer-health flags (missing/self payer).
- `classes_getTeacherDashboardSummary` (READ): teacher dashboard summary metrics in a range.
- `classes_getTeacherDashboardUnpaidInvoices` (READ): count unpaid class-related invoices.
- `classes_markSessionDone` (WRITE): mark a session done; requires explicit user confirmation.
- `classes_bulkUpsertAttendance` (WRITE): bulk attendance updates; requires explicit user confirmation.

### Cash Management Workflow

- The assistant must use the conversational workflow: "Chat -> Clarify -> Confirm -> Save -> HTML Kassenbericht Preview".
- When dealing with cash amounts, the assistant must never guess the destination or purpose of withdrawn money. Always clarify ambiguity with the user.
- **Do not let the model calculate official cash sales.** The model must call `get_cash_report_preview` first, which calculates the official retrograde calculation based on persisted domain records.
- Write tools like `create_cash_entry`, `submit_counted_cash`, and `close_cash_day` MUST only be called AFTER explicit user confirmation of the extracted details or the preview.
