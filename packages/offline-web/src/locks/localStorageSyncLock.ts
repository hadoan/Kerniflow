import { type Clock, type SyncLock } from "@corely/offline-core";

interface LocalStorageSyncLockOptions {
  ttlMs?: number;
  keyPrefix?: string;
  clock?: Clock;
  storage?: Storage;
}

export class LocalStorageSyncLock implements SyncLock {
  private readonly ttlMs: number;
  private readonly keyPrefix: string;
  private readonly clock: Clock;
  private readonly storage: Storage;

  constructor(options: LocalStorageSyncLockOptions = {}) {
    this.ttlMs = options.ttlMs ?? 15000;
    this.keyPrefix = options.keyPrefix ?? "corely_sync_lock";
    this.clock = options.clock ?? { now: () => new Date() };
    this.storage = options.storage ?? window.localStorage;
  }

  async acquire(workspaceId: string): Promise<boolean> {
    const key = this.keyFor(workspaceId);
    const existingRaw = this.storage.getItem(key);
    const now = this.clock.now().getTime();

    if (existingRaw) {
      try {
        const existing = JSON.parse(existingRaw) as { expiresAt: number };
        if (existing.expiresAt > now) {
          return false;
        }
      } catch {
        // continue
      }
    }

    const expiresAt = now + this.ttlMs;
    this.storage.setItem(key, JSON.stringify({ expiresAt }));
    return true;
  }

  async release(workspaceId: string): Promise<void> {
    const key = this.keyFor(workspaceId);
    this.storage.removeItem(key);
  }

  private keyFor(workspaceId: string): string {
    return `${this.keyPrefix}:${workspaceId}`;
  }
}
