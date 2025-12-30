# Offline Implementation Guide (Current State)

This document explains how the new offline foundation is structured and how to extend it. It covers the shared core, web adapters, React Native skeleton, and expected backend contracts.

## Package map

- `@corely/offline-core` (pure TS, platform-agnostic)
  - Ports: `OutboxStore`, `SyncTransport`, `SyncLock`, `NetworkMonitor`, `Clock`, `IdGenerator`, `Logger`
  - Command primitives: `OutboxCommand` model, serializer helpers, `CommandRegistry`
  - Sync engine: batching, exponential backoff with jitter, lock-guarded flush, conflict propagation, event subscription
  - Testing utilities: in-memory outbox store, fake lock/network/clock/id generator, vitest suite
- `@corely/offline-web` (browser adapters)
  - IndexedDB outbox store (`IndexedDbOutboxStore`) with workspace/status index
  - Cross-tab TTL lock (`LocalStorageSyncLock`)
  - Network monitor using `navigator.onLine` and online/offline events
  - TanStack Query persister for IndexedDB (`createIndexedDbPersister`)
- `@corely/offline-rn` (skeleton)
  - NetInfo-based `ReactNativeNetworkMonitor`
  - Placeholder `ReactNativeOutboxStore` to be replaced with SQLite-backed adapter

## Sync engine behavior (`offline-core`)

1. Acquire workspace lock to avoid concurrent flushes.
2. Load pending commands (filtered by `nextAttemptAt`) up to `batchSize`.
3. Mark commands `IN_FLIGHT`, execute via transport (batch if provided).
4. Handle results:
   - `OK` → mark `SUCCEEDED`
   - `CONFLICT` → mark `CONFLICT`, emit conflict event
   - `RETRYABLE_ERROR` → increment attempts, set `nextAttemptAt` using exponential backoff + jitter
   - `FATAL_ERROR` → mark `FAILED`
5. Emit events: `flushStarted/Finished`, `commandUpdated`, `statusChanged`, `conflictDetected`.
6. Release lock.

## Web wiring (`apps/web`)

- `apps/web/src/offline/offline-provider.tsx` instantiates:
  - `SyncEngine` with IndexedDB outbox store, localStorage lock, web network monitor, and console logger.
  - Query cache persistence via `persistQueryClient` + IndexedDB persister, scoped by `userId + workspaceId`.
  - Tracks active workspace from `WorkspaceProvider` to partition caches/outbox.
- The sync transport is a placeholder; wire it to REST endpoints (or a future `/sync/commands` batch) and include `X-Workspace-Id` + `X-Idempotency-Key` headers.

## Backend expectations

- Idempotency: every mutation invoked via outbox must accept `X-Idempotency-Key` and dedupe on `(workspaceId, userId, idempotencyKey)`.
- Workspace scoping: require `X-Workspace-Id` on writes and enforce tenant isolation server-side.
- Conflicts: return `409` with current server snapshot/version; the client will surface `CONFLICT` states.
- Recommended: add `POST /sync/commands` for batch execution to share across web and RN.

## Adding a new offline command

1. Define payload schema in `@corely/contracts` and register it in a `CommandRegistry` instance.
2. In the UI, create an `OutboxCommand` with client-generated `commandId` and `idempotencyKey`; enqueue via platform `OutboxStore` and apply optimistic cache updates.
3. Implement transport mapping `type → API call`, ensuring idempotency and workspace headers.
4. Handle conflicts in UI (e.g., show “conflict” status and CTA to retry/resolve).

## Data partitioning & cleanup

- Partition keys by workspace (and user where relevant) for both outbox and query cache.
- On logout or workspace switch, clear or rehydrate the appropriate partitions before use.
- Avoid persisting highly sensitive datasets unless explicitly allowed.

## Testing pointers

- Core: use `InMemoryOutboxStore`, `InMemoryLock`, and `TestNetworkMonitor` with vitest to cover success, retry/backoff, conflicts, and lock contention.
- Web adapters: add tests for IndexedDB CRUD, lock TTL expiry, and navigator event handling (jsdom).
- Integration: simulate offline enqueue → UI shows “pending”; go online → flush → “synced”; simulate `CONFLICT` → UI reflects conflict state.
