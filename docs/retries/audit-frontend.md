# Frontend HTTP + Retry Audit

- **HTTP wrappers**
  - `apps/web/src/lib/api-client.ts`: single fetch-based wrapper for JSON requests; attaches `Authorization`, `X-Workspace-Id`, optional `X-Idempotency-Key`, and correlation IDs. No built-in retry/backoff; throws on non-2xx.
  - `apps/web/src/lib/auth-client.ts`: raw fetch calls for auth (`/auth/signup|login|me|refresh|logout|switch-tenant`), includes idempotency key only for signup; retries `getCurrentUser` once via token refresh but otherwise no retry policy.
  - `apps/e2e/utils/api.ts`: test-only fetch helper (basic POST/GET/PATCH) without retries.
  - `apps/web/src/shared/mock/mockApi.ts`: in-memory mock API used for local/mock mode; maintains its own idempotency cache (not network).

- **Primary call sites using `api-client`**
  - `apps/web/src/lib/expenses-api.ts`: `listExpenses` (GET) and `createExpense` (POST) with generated idempotency + correlation IDs.
  - `apps/web/src/lib/invoices-api.ts`: create/list/get/update/finalize/send/cancel invoice endpoints; write operations include generated idempotency keys.
  - `apps/web/src/lib/tax-api.ts`: profile, codes, rates, calculate, lock snapshot; write operations (PUT/PATCH/POST) include generated idempotency keys.
  - `apps/web/src/shared/workspaces/workspaces-api.ts`: workspace CRUD/invites endpoints; writes include generated idempotency keys and correlation IDs.

- **Other direct HTTP usage**
  - `apps/web/src/routes/copilot.tsx`: `useChat` (streaming) posts to `/copilot/chat` with `Authorization`, `X-Tenant-Id`, and a generated `X-Idempotency-Key`; streaming response handled by `@ai-sdk/react`.
  - `apps/web/src/shared/workspaces/workspace-provider.tsx`: react-query `refetch()` only (uses existing query client).

- **Idempotency key generation/passing**
  - `apiClient.generateIdempotencyKey()` and callers above attach `X-Idempotency-Key` on most POST/PATCH/PUT writes.
  - `auth-client` has its own generator used only for signup.
  - Mock API (`mockApi.ts`) keeps a local `idempotencyCache` keyed by provided idempotencyKey.

- **Streaming endpoints**
  - `/copilot/chat` (SSE/streamed response via `useChat`); client sets an idempotency key per chat request.

- **Query/mutation defaults**
  - `QueryClient` instances created in `apps/web/src/app/providers/index.tsx` and `apps/web/src/offline/offline-provider.tsx` use TanStack defaults (no custom retry/backoff settings defined, no global idempotency handling). Query/mutation retries therefore follow library defaults and not a shared policy.
