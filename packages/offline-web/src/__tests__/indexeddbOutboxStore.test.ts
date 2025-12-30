import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  indexedDB,
  IDBKeyRange,
  IDBRequest,
  IDBTransaction,
  IDBDatabase,
  IDBObjectStore,
  IDBIndex,
  IDBCursor,
  IDBCursorWithValue,
} from "fake-indexeddb";
import { IndexedDbOutboxStore } from "../outbox/indexeddbOutboxStore";
import { DEFAULT_DB_NAME, resetDb } from "../idb";
import { OutboxCommand } from "@corely/offline-core";

// Provide IndexedDB globals for idb library
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).indexedDB = indexedDB;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).IDBKeyRange = IDBKeyRange;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).IDBRequest = IDBRequest;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).IDBTransaction = IDBTransaction;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).IDBDatabase = IDBDatabase;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).IDBObjectStore = IDBObjectStore;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).IDBIndex = IDBIndex;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).IDBCursor = IDBCursor;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).IDBCursorWithValue = IDBCursorWithValue;

const workspaceId = "ws-1";

function buildCommand(overrides: Partial<OutboxCommand> = {}): OutboxCommand {
  return {
    commandId: `cmd-${Math.random()}`,
    workspaceId,
    type: "TEST",
    payload: { ok: true },
    createdAt: new Date(),
    status: "PENDING",
    attempts: 0,
    idempotencyKey: `idem-${Math.random()}`,
    ...overrides,
  };
}

describe("IndexedDbOutboxStore", () => {
  beforeEach(async () => {
    await resetDb(DEFAULT_DB_NAME);
  });

  afterEach(async () => {
    await resetDb(DEFAULT_DB_NAME);
  });

  it("enqueues and lists pending commands", async () => {
    const store = new IndexedDbOutboxStore();
    const cmd = buildCommand();
    await store.enqueue(cmd);

    const pending = await store.listPending(workspaceId, 10);
    expect(pending).toHaveLength(1);
    expect(pending[0].commandId).toBe(cmd.commandId);
  });

  it("marks lifecycle statuses and preserves metadata", async () => {
    const store = new IndexedDbOutboxStore();
    const cmd = buildCommand();
    await store.enqueue(cmd);

    await store.markInFlight(cmd.commandId);
    await store.markSucceeded(cmd.commandId, { serverVersion: 2 });
    let stored = await store.getById(cmd.commandId);
    expect(stored?.status).toBe("SUCCEEDED");
    expect((stored as unknown as { meta?: unknown }).meta).toEqual({ serverVersion: 2 });

    await store.enqueue(buildCommand({ commandId: "conflict" }));
    await store.markConflict("conflict", { reason: "version" });
    stored = await store.getById("conflict");
    expect(stored?.status).toBe("CONFLICT");
    expect((stored as unknown as { conflict?: unknown }).conflict).toEqual({ reason: "version" });
  });

  it("schedules retries with nextAttemptAt", async () => {
    const store = new IndexedDbOutboxStore();
    const cmd = buildCommand({ commandId: "retry-me" });
    await store.enqueue(cmd);

    const next = new Date(Date.now() + 1000);
    await store.incrementAttempt("retry-me", next);
    const stored = await store.getById("retry-me");
    expect(stored?.attempts).toBe(1);
    expect(stored?.nextAttemptAt?.getTime()).toBeCloseTo(next.getTime(), -2);
    expect(stored?.status).toBe("PENDING");
  });

  it("clears all commands for a workspace", async () => {
    const store = new IndexedDbOutboxStore();
    await store.enqueue(buildCommand({ commandId: "a" }));
    await store.enqueue(buildCommand({ commandId: "b", workspaceId: "ws-2" }));

    await store.clearWorkspace(workspaceId);
    const remainingWs1 = await store.listPending(workspaceId, 10);
    const remainingWs2 = await store.listPending("ws-2", 10);

    expect(remainingWs1).toHaveLength(0);
    expect(remainingWs2).toHaveLength(1);
  });
});
