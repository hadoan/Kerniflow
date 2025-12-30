# Offline-first architecture

This repo now ships shared offline scaffolding that works across web (today) and future React Native clients by keeping platform-agnostic logic in `packages/offline-core` and thin adapters in `packages/offline-web` / `packages/offline-rn`.

## Packages

- `@corely/offline-core`: pure TypeScript ports for the outbox, sync engine, locking, transports, and command registry. Includes a reference `SyncEngine` with backoff/lock handling plus an in-memory store for tests.
- `@corely/offline-web`: browser adapters: IndexedDB-backed `OutboxStore`, localStorage lock with TTL, network monitor using `navigator.onLine`, and an IndexedDB query persister for TanStack Query.
- `@corely/offline-rn`: React Native skeleton. Provides a `ReactNativeNetworkMonitor` that expects a NetInfo-like object; the outbox store is intentionally left unimplemented so a SQLite-backed adapter can be dropped in.

## Web wiring (current state)

- `apps/web/src/offline/offline-provider.tsx` boots a shared `SyncEngine`, IndexedDB outbox store, localStorage lock, and query-cache persistence keyed by `userId + workspaceId`. It is injected via the top-level `Providers` wrapper so cached queries survive reloads and reconnections.
- The sync transport is a placeholder; wire it to your API client (either per-command REST calls with `Idempotency-Key` + `X-Workspace-Id` headers or a future `/sync/commands` endpoint) before queuing real offline mutations.
- Workspace scoping: the `OfflineProvider` tracks the active workspace id from `WorkspaceProvider` to partition caches and lock scopes.

## Backend expectations

- All write endpoints that may be queued offline must accept `X-Idempotency-Key` and `X-Workspace-Id`. The existing Nest idempotency guard/interceptor can be reused; ensure the key is stored with `(workspaceId, userId)` context.
- For conflict detection, return `409` with the latest server snapshot/version when optimistic updates send stale versions.
- Recommended next step: add a generic `POST /sync/commands` endpoint that accepts `{ workspaceId, commands: [...] }` to unlock batch transports shared by web + RN.

## Adding a new offline command

1. Define the payload schema in `packages/contracts` and register it in `packages/offline-core` via `CommandRegistry`.
2. When the UI enqueues a command, persist it through the platform `OutboxStore`, apply optimistic cache updates, and let `SyncEngine` flush when online.
3. Implement the transport mapping from command `type` to the correct API call; include `Idempotency-Key` and workspace headers.
4. Handle `CONFLICT` results by surfacing a UI CTA and tagging the affected entity with `syncStatus: "conflict"`.

## Testing

- `@corely/offline-core` ships unit tests for the sync engine (success, retry/backoff, conflict, lock contention) and an in-memory outbox store for contract tests.
- To add web adapter tests, target IndexedDB CRUD, lock TTL behaviour, and network monitor events using `vitest` with `jsdom`.
