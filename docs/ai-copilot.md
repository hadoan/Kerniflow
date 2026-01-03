## AI Copilot integration

- **Frontend defaults**: `VITE_API_BASE_URL` now points to the real API (`http://localhost:3000`) and `VITE_API_MODE=real`. Set `VITE_API_MODE=mock` if you explicitly want to point to the mock server (`http://localhost:4000` or `VITE_MOCK_API_BASE_URL`).
- **Shared client**: Use `useCopilotChatOptions` from `apps/web/src/lib/copilot-api.ts` to configure `useChat` across pages. It injects `Authorization`, `X-Tenant-Id` (workspace), and `X-Idempotency-Key` headers and targets `/copilot/chat` or `/copilot/runs/:id/messages` for streaming.
- **Backend surface**: NestJS now exposes `POST /copilot/runs` to create a run, `GET /copilot/runs/:id` to fetch metadata, `GET /copilot/runs/:id/messages` to fetch history, and `POST /copilot/runs/:id/messages` to append + stream. Legacy `POST /copilot/chat` remains for compatibility.
- **Running locally**: start `services/api` (`pnpm --filter services/api start:dev`) and `apps/web` (`pnpm --filter apps/web dev`). Ensure `VITE_API_MODE=real` and valid `VITE_API_BASE_URL`. For mock fallback, start `services/mock-server` and switch the mode.

### Model provider config

- Set `AI_MODEL_PROVIDER=openai` or `anthropic`.
- OpenAI default: `AI_MODEL_ID=gpt-4o-mini` and `OPENAI_API_KEY=<your-key>`.
- Anthropic sample: `AI_MODEL_PROVIDER=anthropic`, `AI_MODEL_ID=claude-3-5-sonnet-20240620`, `ANTHROPIC_API_KEY=sk-ant-...`.

### Interactive collect_inputs tool

- The backend registers a client-handled `collect_inputs` tool (AI SDK) so the model can request structured fields mid-conversation.
- Frontend renders the tool call as a `QuestionForm` and replies via `addToolResult` to continue the run automatically.
